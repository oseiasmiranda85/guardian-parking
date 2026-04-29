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
        // 1. Try to find plates in single lines or blocks
        for (block in text.textBlocks) {
            for (line in block.lines) {
                val found = extractPlate(line.text)
                if (found != null) {
                    onTextFound(found)
                    return
                }
            }
            // Try joining lines in a block (useful for 2-line moto plates)
            val joinedBlock = block.lines.joinToString("") { it.text }
            val foundInBlock = extractPlate(joinedBlock)
            if (foundInBlock != null) {
                onTextFound(foundInBlock)
                return
            }
        }
        
        // 2. Global search: combine all text and search for 7-char sequences
        val allText = text.text.replace("\n", "").replace(" ", "").uppercase()
        val foundGlobal = extractPlate(allText)
        if (foundGlobal != null) {
            onTextFound(foundGlobal)
        }
    }

    private fun extractPlate(text: String): String? {
        // Radical Cleaning: Keep ONLY A-Z and 0-9
        val cleaned = text.uppercase().filter { it.isLetterOrDigit() }
        
        // We look for 7 characters. If it has 8, maybe it captured a hyphen as a character or extra noise
        if (cleaned.length < 7) return null

        // Sliding window to find a valid 7-char sequence
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
        
        // POS 0, 1, 2: ALWAYS LETTERS
        for (i in 0..2) {
            chars[i] = charToLetter(chars[i])
        }
        
        // POS 3: ALWAYS DIGIT
        chars[3] = charToDigit(chars[3])
        
        // POS 4: LETTER (Mercosul) or DIGIT (Legacy)
        // Heuristics for POS 4: 
        // If POS 5 & 6 are digits, and POS 4 is a digit -> Legacy
        // If POS 5 & 6 are digits, and POS 4 is a letter -> Mercosul
        // This is tricky, we leave it as is unless it's a very common mistake
        if (chars[4] == '0') { 
             // 0 is often used in both, but if it's Mercosul it should be 'O'
             // Most Mercosul plates have a letter here.
        }

        // POS 5, 6: ALWAYS DIGITS
        for (i in 5..6) {
            chars[i] = charToDigit(chars[i])
        }
        
        return String(chars)
    }

    private fun charToLetter(c: Char): Char = when (c) {
        '0' -> 'O'
        '1' -> 'I'
        '2' -> 'Z'
        '4' -> 'A'
        '5' -> 'S'
        '8' -> 'B'
        '6' -> 'G'
        else -> c
    }

    private fun charToDigit(c: Char): Char = when (c) {
        'O' -> '0'
        'I' -> '1'
        'Z' -> '2'
        'A' -> '4'
        'S' -> '5'
        'B' -> '8'
        'G' -> '6'
        'T' -> '7'
        'Q' -> '0'
        'D' -> '0'
        else -> c
    }

    private fun isValidPlate(plate: String): Boolean {
        // Pattern 1: Legacy (AAA-9999) -> AAA9999
        val legacyPattern = "^[A-Z]{3}[0-9]{4}$".toRegex()
        // Pattern 2: Mercosul (AAA9A99)
        val mercosulPattern = "^[A-Z]{3}[0-9][A-Z][0-9]{2}$".toRegex()
        
        return legacyPattern.matches(plate) || mercosulPattern.matches(plate)
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
