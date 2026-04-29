package com.parking.stone

import android.app.Application

class ParkingApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: ParkingApp
            private set
    }
}
