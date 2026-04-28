package com.parking.stone.hardware

import android.annotation.SuppressLint
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class TextAnalyzer(
    private val onTextFound: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    processText(visionText)
                }
                .addOnFailureListener { e ->
                    // Handle error
                    e.printStackTrace()
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun processText(text: Text) {
        // Try block by block first (concatenating lines for 2-line plates)
        for (block in text.textBlocks) {
            val blockText = block.lines.joinToString("") { it.text }
            val foundPlate = extractPlate(blockText)
            if (foundPlate != null) {
                onTextFound(foundPlate)
                return
            }
        }
        
        // Fallback: search in the entire recognized text
        val fullText = text.text.replace("\n", "")
        val foundFull = extractPlate(fullText)
        if (foundFull != null) {
            onTextFound(foundFull)
        }
    }

    private fun extractPlate(text: String): String? {
        // 1. Radical Cleaning: Keep ONLY A-Z and 0-9
        val cleaned = text.uppercase().filter { it.isLetterOrDigit() }

        // 2. Regex for Brazilian plates (Legacy & Mercosul)
        val platePattern = "[A-Z0-9]{7}".toRegex()
        
        // Find 7-char sequences and apply heuristics
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
        
        // Position 0, 1, 2: MUST BE LETTERS
        for (i in 0..2) {
            chars[i] = when (chars[i]) {
                '0' -> 'O'
                '1' -> 'I'
                '2' -> 'Z'
                '4' -> 'A'
                '5' -> 'S'
                '8' -> 'B'
                else -> chars[i]
            }
        }
        
        // Position 3, 5, 6: MUST BE DIGITS
        val digitPositions = listOf(3, 5, 6)
        for (i in digitPositions) {
            chars[i] = when (chars[i]) {
                'O' -> '0'
                'I' -> '1'
                'Z' -> '2'
                'A' -> '4'
                'S' -> '5'
                'B' -> '8'
                'G' -> '6'
                'T' -> '7'
                else -> chars[i]
            }
        }
        
        // Position 4: Can be Digit (Legacy) or Letter (Mercosul)
        // No radical swap here unless we detect a clear pattern
        
        return String(chars)
    }

    private fun isValidPlate(plate: String): Boolean {
        // Final check: LLL N (L/N) NN
        val pattern = "^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$".toRegex()
        return pattern.matches(plate)
    }

    companion object {
        fun analyzeImageFile(context: android.content.Context, path: String, onResult: (String?) -> Unit) {
            val file = java.io.File(path)
            if (!file.exists()) {
                onResult(null)
                return
            }

            val image = com.google.mlkit.vision.common.InputImage.fromFilePath(context, android.net.Uri.fromFile(file))
            val recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val analyzer = TextAnalyzer { } // Dummy for internal use
                    var detected: String? = null
                    
                    // Try blocks first
                    for (block in visionText.textBlocks) {
                        val blockText = block.lines.joinToString("") { it.text }
                        detected = analyzer.extractPlate(blockText)
                        if (detected != null) break
                    }
                    
                    // Fallback to full text
                    if (detected == null) {
                        detected = analyzer.extractPlate(visionText.text)
                    }
                    
                    onResult(detected)
                }
                .addOnFailureListener {
                    onResult(null)
                }
        }
    }
}
