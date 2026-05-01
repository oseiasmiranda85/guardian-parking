package com.parking.stone.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.parking.stone.data.model.ParkingEntry
import com.parking.stone.data.model.CashSession
import com.parking.stone.data.model.CashTransaction
import com.parking.stone.data.model.Telemetry

@Dao
interface TelemetryDao {
    @Insert
    suspend fun insert(telemetry: Telemetry)

    @Query("SELECT * FROM telemetry WHERE synced = 0")
    suspend fun getUnsynced(): List<Telemetry>

    @Query("UPDATE telemetry SET synced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Long>)
    
    @Query("DELETE FROM telemetry WHERE synced = 1")
    suspend fun clearSynced()
}

@Dao
interface ParkingDao {
    @Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun upsertEntry(entry: ParkingEntry): Long

    @Insert
    suspend fun insertEntry(entry: ParkingEntry): Long

    @Query("SELECT * FROM parking_entries WHERE exitTime IS NULL AND tenantId = :tenantId ORDER BY entryTime DESC")
    suspend fun getActiveEntries(tenantId: Int): List<ParkingEntry>

    @Query("SELECT * FROM parking_entries WHERE tenantId = :tenantId ORDER BY entryTime DESC LIMIT 100")
    suspend fun getRecentEntries(tenantId: Int): List<ParkingEntry>

    @Query("SELECT * FROM parking_entries WHERE isSynced = 0 AND tenantId = :tenantId")
    suspend fun getUnsyncedEntries(tenantId: Int): List<ParkingEntry>

    @Query("UPDATE parking_entries SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Long>)
    
    @Query("SELECT * FROM parking_entries WHERE plate = :plate AND tenantId = :tenantId AND ABS(entryTime - :entryTime) < 5000 LIMIT 1")
    suspend fun getEntryByPlateAndEntryTime(plate: String, entryTime: Long, tenantId: Int): ParkingEntry?

    @Query("SELECT * FROM parking_entries WHERE plate = :plate AND tenantId = :tenantId AND exitTime IS NULL ORDER BY entryTime DESC LIMIT 1")
    suspend fun getActiveEntryByPlate(plate: String, tenantId: Int): ParkingEntry?

    @Query("SELECT * FROM parking_entries WHERE id = :ticketId LIMIT 1")
    suspend fun getEntryById(ticketId: Long): ParkingEntry?

    @Query("SELECT * FROM parking_entries WHERE uuid = :uuid LIMIT 1")
    suspend fun getEntryByUuid(uuid: String): ParkingEntry?

    @androidx.room.Update
    suspend fun updateEntry(entry: ParkingEntry): Int

    // Statistics for Closing
    @Query("SELECT paymentMethod, SUM(amount) as total, COUNT(*) as count FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND isPaid = 1 AND isCancelled = 0 AND tenantId = :tenantId GROUP BY paymentMethod")
    suspend fun getPaymentStats(operatorId: String, startTime: Long, tenantId: Int): List<PaymentStat>

    @Query("SELECT type, COUNT(*) as count, SUM(amount) as total FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND isPaid = 1 AND isCancelled = 0 AND tenantId = :tenantId GROUP BY type")
    suspend fun getVehicleStats(operatorId: String, startTime: Long, tenantId: Int): List<VehicleStat>

    @Query("SELECT COUNT(*) as count, SUM(amount) as total FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND isCancelled = 1 AND tenantId = :tenantId")
    suspend fun getCancelledStats(operatorId: String, startTime: Long, tenantId: Int): CancelledStat

    @Query("SELECT COUNT(*) FROM parking_entries WHERE exitTime IS NULL AND tenantId = :tenantId AND isCancelled = 0")
    suspend fun getActiveVehicleCount(tenantId: Int): Int

    @Query("SELECT COUNT(*) FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND tenantId = :tenantId")
    suspend fun getOperatorEntryCount(operatorId: String, startTime: Long, tenantId: Int): Int

    @Query("SELECT COUNT(*) as count, 0.0 as total FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND category = 'CREDENCIADO' AND tenantId = :tenantId")
    suspend fun getAccreditedStats(operatorId: String, startTime: Long, tenantId: Int): SimpleStat

    @Query("SELECT COUNT(*) as count, 0.0 as total FROM parking_entries WHERE operatorId = :operatorId AND entryTime >= :startTime AND exitTime IS NOT NULL AND amount = 0 AND isPaid = 0 AND tenantId = :tenantId")
    suspend fun getToleranceStats(operatorId: String, startTime: Long, tenantId: Int): SimpleStat

    @Query("SELECT * FROM cash_sessions WHERE tenantId = :tenantId")
    suspend fun getAllSessions(tenantId: Int): List<CashSession>

    @Query("SELECT * FROM parking_entries WHERE tenantId = :tenantId AND photoPath IS NOT NULL AND photoUrl IS NULL")
    suspend fun getEntriesWithPendingPhotos(tenantId: Int): List<ParkingEntry>

    @Query("UPDATE parking_entries SET photoUrl = :url WHERE id = :id")
    suspend fun updatePhotoUrl(id: Long, url: String?)

    @Query("UPDATE parking_entries SET photoPath = :path WHERE id = :id")
    suspend fun updatePhotoPath(id: Long, path: String?)
}

data class PaymentStat(val paymentMethod: String?, val total: Double, val count: Int)
data class VehicleStat(val type: String, val count: Int, val total: Double)
data class CancelledStat(val count: Int, val total: Double)
data class SimpleStat(val count: Int, val total: Double)

@Dao
interface CashDao {
    @Insert
    suspend fun insertSession(session: CashSession): Long

    @Insert
    suspend fun insertTransaction(transaction: CashTransaction): Long

    @Query("SELECT * FROM cash_sessions WHERE status = 'OPEN' AND tenantId = :tenantId LIMIT 1")
    suspend fun getCurrentOpenSession(tenantId: Int): CashSession?

    @Query("UPDATE cash_sessions SET status = 'CLOSED', endTime = :endTime, closingBalance = :closingBalance, totalRevenue = :totalRevenue WHERE id = :sessionId")
    suspend fun closeSession(sessionId: String, endTime: Long, closingBalance: Double, totalRevenue: Double): Int
}

@Database(entities = [ParkingEntry::class, CashSession::class, CashTransaction::class, Telemetry::class], version = 13, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun parkingDao(): ParkingDao
    abstract fun cashDao(): CashDao
    abstract fun telemetryDao(): TelemetryDao
    
    companion object {
        @Volatile private var instance: AppDatabase? = null
        
        fun getDatabase(context: Context): AppDatabase =
            instance ?: synchronized(this) { 
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java, 
                    "parking_db"
                )
                .fallbackToDestructiveMigration() // For dev speed, wipe db on schema change
                .build().also { instance = it }
            }
    }
}
