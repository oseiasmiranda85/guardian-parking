package com.parking.stone.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.io.FileOutputStream

object ImageUtils {

    fun getHighResFile(context: Context, ticketId: String): File {
        val dir = File(context.cacheDir, "high_res")
        if (!dir.exists()) dir.mkdirs()
        return File(dir, "ticket_$ticketId.jpg")
    }

    fun getLowResFile(context: Context, ticketId: String): File {
        val dir = File(context.filesDir, "low_res")
        if (!dir.exists()) dir.mkdirs()
        return File(dir, "ticket_$ticketId.jpg")
    }

    fun optimizeStorage(context: Context, ticketId: String) {
        try {
            val highRes = getHighResFile(context, ticketId)
            if (highRes.exists()) {
                // 1. Create Low Res
                val bitmap = BitmapFactory.decodeFile(highRes.absolutePath)
                if (bitmap != null) {
                    val lowRes = getLowResFile(context, ticketId)
                    val scaled = Bitmap.createScaledBitmap(bitmap, 480, 640, true) // Reduced
                    val out = FileOutputStream(lowRes)
                    scaled.compress(Bitmap.CompressFormat.JPEG, 70, out)
                    out.flush()
                    out.close()
                }
                
                // 2. Delete High Res
                highRes.delete()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun purgeAllLowRes(context: Context) {
        try {
            val dir = File(context.filesDir, "low_res")
            if (dir.exists()) {
                dir.deleteRecursively()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
