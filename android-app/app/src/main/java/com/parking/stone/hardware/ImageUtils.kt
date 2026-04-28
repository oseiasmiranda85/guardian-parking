package com.parking.stone.hardware

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.camera.core.ImageProxy
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object ImageUtils {

    fun saveAndOptimizeImage(context: Context, imageProxy: ImageProxy, fileName: String): String? {
        try {
            val bitmap = imageProxyToBitmap(imageProxy) ?: return null
            
            // Resize to 1024x768 (Max) while maintaining aspect ratio
            val optimizedBitmap = resizeBitmap(bitmap, 1024, 768)
            
            val file = File(context.filesDir, "photos")
            if (!file.exists()) file.mkdirs()
            
            val photoFile = File(file, fileName)
            val out = FileOutputStream(photoFile)
            optimizedBitmap.compress(Bitmap.CompressFormat.JPEG, 75, out)
            out.flush()
            out.close()
            
            return photoFile.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        } finally {
            imageProxy.close()
        }
    }

    private fun imageProxyToBitmap(image: ImageProxy): Bitmap? {
        val planeProxy = image.planes[0]
        val buffer = planeProxy.buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        
        // Handle rotation
        val rotationDegrees = image.imageInfo.rotationDegrees
        if (rotationDegrees == 0) return bitmap
        
        val matrix = Matrix()
        matrix.postRotate(rotationDegrees.toFloat())
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun resizeBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        val ratioBitmap = width.toFloat() / height.toFloat()
        val ratioMax = maxWidth.toFloat() / maxHeight.toFloat()
        
        var finalWidth = maxWidth
        var finalHeight = maxHeight
        
        if (ratioMax > ratioBitmap) {
            finalWidth = (maxHeight.toFloat() * ratioBitmap).toInt()
        } else {
            finalHeight = (maxWidth.toFloat() / ratioBitmap).toInt()
        }
        
        val resized = Bitmap.createScaledBitmap(bitmap, finalWidth, finalHeight, true)
        
        // --- CONTRAST ENHANCEMENT ---
        val contrast = 1.5f // Increase contrast by 50%
        val brightness = -10f // Slightly darken to make characters pop
        
        val cm = android.graphics.ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, brightness,
            0f, contrast, 0f, 0f, brightness,
            0f, 0f, contrast, 0f, brightness,
            0f, 0f, 0f, 1f, 0f
        ))
        
        val result = Bitmap.createBitmap(finalWidth, finalHeight, resized.config)
        val canvas = android.graphics.Canvas(result)
        val paint = android.graphics.Paint()
        paint.colorFilter = android.graphics.ColorMatrixColorFilter(cm)
        canvas.drawBitmap(resized, 0f, 0f, paint)
        
        return result
    }
}
