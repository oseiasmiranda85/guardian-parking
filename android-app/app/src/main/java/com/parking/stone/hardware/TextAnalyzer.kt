package com.parking.stone.hardware

import android.annotation.SuppressLint
import android.content.Context
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.parking.stone.data.TelemetryManager

class TextAnalyzer(
    private val context: Context,
    private val onTextFound: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val startTime = System.currentTimeMillis()
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

            recognizer.process(image)
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
                .addOnFailureListener { e ->
                    e.printStackTrace()
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun processText(text: Text, onPlateFound: () -> Unit) {
        for (block in text.textBlocks) {
            for (line in block.lines) {
                val found = extractPlate(line.text)
                if (found != null) {
                    onPlateFound()
                    onTextFound(found)
                    return
                }
            }
            val joinedBlock = block.lines.joinToString("") { it.text }
            val foundInBlock = extractPlate(joinedBlock)
            if (foundInBlock != null) {
                onPlateFound()
                onTextFound(foundInBlock)
                return
            }
        }
        
        val allText = text.text.replace("\n", "").replace(" ", "").uppercase()
        val foundGlobal = extractPlate(allText)
        if (foundGlobal != null) {
            onPlateFound()
            onTextFound(foundGlobal)
        }
    }

    private fun extractPlate(text: String): String? {
        val cleaned = text.uppercase().filter { it.isLetterOrDigit() }
        if (cleaned.length < 7) return null

        for (i in 0..(cleaned.length - 7)) {
            val candidate = cleaned.substring(i, i + 7)
            val corrected = applyHeuristics(candidate)
            if (isValidPlate(corrected)) return corrected
        }
        return null
    }

    private fun applyHeuristics(plate: String): String {
        if (plate.length != 7) return plate
        val chars = plate.toCharArray()
        for (i in 0..2) chars[i] = charToLetter(chars[i])
        chars[3] = charToDigit(chars[3])
        for (i in 5..6) chars[i] = charToDigit(chars[i])
        return String(chars)
    }

    private fun charToLetter(c: Char): Char = when (c) {
        '0' -> 'O'; '1' -> 'I'; '2' -> 'Z'; '4' -> 'A'; '5' -> 'S'; '8' -> 'B'; '6' -> 'G'
        else -> c
    }

    private fun charToDigit(c: Char): Char = when (c) {
        'O' -> '0'; 'I' -> '1'; 'Z' -> '2'; 'A' -> '4'; 'S' -> '5'; 'B' -> '8'; 'G' -> '6'; 'T' -> '7'; 'Q' -> '0'; 'D' -> '0'
        else -> c
    }

    private fun isValidPlate(plate: String): Boolean {
        val legacyPattern = "^[A-Z]{3}[0-9]{4}$".toRegex()
        val mercosulPattern = "^[A-Z]{3}[0-9][A-Z][0-9]{2}$".toRegex()
        return legacyPattern.matches(plate) || mercosulPattern.matches(plate)
    }

    companion object {
        fun analyzeImageFile(context: Context, path: String, onResult: (String?) -> Unit) {
            val file = java.io.File(path)
            if (!file.exists()) { onResult(null); return }

            val image = InputImage.fromFilePath(context, android.net.Uri.fromFile(file))
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val analyzer = TextAnalyzer(context) { } 
                    var detected: String? = null
                    for (block in visionText.textBlocks) {
                        val blockText = block.lines.joinToString("") { it.text }
                        detected = analyzer.extractPlate(blockText)
                        if (detected != null) break
                    }
                    if (detected == null) detected = analyzer.extractPlate(visionText.text)
                    onResult(detected)
                }
                .addOnFailureListener { onResult(null) }
        }
    }
}
