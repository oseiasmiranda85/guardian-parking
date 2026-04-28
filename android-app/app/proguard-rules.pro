# Room
-keep class androidx.room.RoomDatabase { *; }
-keep class androidx.room.Room { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-keep class * extends androidx.room.RoomDatabase_Impl { *; }
-dontwarn androidx.room.paging.**

# Retrofit
-keepattributes Signature
-keepattributes Exceptions
-dontwarn okio.**
-dontwarn javax.annotation.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.android.AndroidExceptionPreHandler {
    <init>();
}

# Data Models (Keep Gson serialized fields)
-keep class com.parking.stone.data.model.** { *; }
-keep class com.parking.stone.data.network.** { *; }
