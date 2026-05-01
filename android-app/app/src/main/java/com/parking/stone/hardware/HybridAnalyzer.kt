package com.parking.stone.hardware

import android.annotation.SuppressLint
import android.content.Context
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.parking.stone.data.TelemetryManager

class HybridAnalyzer(
    private val context: Context,
    private val onResultFound: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val barcodeScanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
    )

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val startTime = System.currentTimeMillis()
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

            barcodeScanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        val firstBarcode = barcodes[0].rawValue ?: ""
                        if (firstBarcode.isNotEmpty()) {
                            onResultFound(firstBarcode)
                            imageProxy.close()
                            return@addOnSuccessListener
                        }
                    }
                    
                    textRecognizer.process(image)
                        .addOnSuccessListener { visionText ->
                            val processTime = (System.currentTimeMillis() - startTime).toInt()
                            processText(visionText) {
                                TelemetryManager.logEvent(
                                    context = context,
                                    eventType = "OCR_FRAME",
                                    ocrTime = processTime
                                )
                            }
                        }
                        .addOnCompleteListener {
                            imageProxy.close()
                        }
                }
                .addOnFailureListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun processText(text: Text, onPlateFound: () -> Unit) {
        for (block in text.textBlocks) {
            val blockText = block.lines.joinToString("") { it.text }
            val foundPlate = extractPlate(blockText)
            if (foundPlate != null) {
                onPlateFound()
                onResultFound(foundPlate)
                return
            }
        }
        
        val fullText = text.text.replace("\n", "")
        val foundFull = extractPlate(fullText)
        if (foundFull != null) {
            onPlateFound()
            onResultFound(foundFull)
        }
    }

    private fun extractPlate(text: String): String? {
        val cleaned = text.uppercase().filter { it.isLetterOrDigit() }
        val platePattern = "[A-Z0-9]{7}".toRegex()
        val matches = platePattern.findAll(cleaned)
        for (match in matches) {
            val corrected = applyHeuristics(match.value)
            if (isValidPlate(corrected)) return corrected
        }
        return null
    }

    private fun applyHeuristics(plate: String): String {
        if (plate.length != 7) return plate
        val chars = plate.toCharArray()
        for (i in 0..2) {
            chars[i] = when (chars[i]) { '0' -> 'O'; '1' -> 'I'; '2' -> 'Z'; '4' -> 'A'; '5' -> 'S'; '8' -> 'B'; else -> chars[i] }
        }
        val digitPositions = listOf(3, 5, 6)
        for (i in digitPositions) {
            chars[i] = when (chars[i]) { 'O' -> '0'; 'I' -> '1'; 'Z' -> '2'; 'A' -> '4'; 'S' -> '5'; 'B' -> '8'; 'G' -> '6'; 'T' -> '7'; else -> chars[i] }
        }
        return String(chars)
    }

    private fun isValidPlate(plate: String): Boolean {
        val pattern = "^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$".toRegex()
        return pattern.matches(plate)
    }
}
