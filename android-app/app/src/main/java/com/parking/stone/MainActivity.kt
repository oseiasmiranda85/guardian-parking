package com.parking.stone

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.parking.stone.ui.theme.StoneParkingTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        com.parking.stone.data.SessionManager.init(this)
        com.parking.stone.data.DeviceManager.init(this)
        setContent {
            StoneParkingTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = androidx.compose.material3.MaterialTheme.colorScheme.background
                ) {
                    ParkingAppNavHost()
                }
            }
        }
    }
}

@Composable
fun ParkingAppNavHost() {
    val navController = rememberNavController()
// Imports from other packages should be handled by the IDE or manually added if automated tools miss them.
// For this tool, I will assume the imports are managed or I can rewrite the file if needed.
// However, since I am viewing 1-41, I'll rewrite the NavHost block.

    NavHost(navController = navController, startDestination = com.parking.stone.ui.Routes.LOGIN) {
        composable(com.parking.stone.ui.Routes.LOGIN) {
            com.parking.stone.ui.screens.LoginScreen(navController)
        }
        composable(com.parking.stone.ui.Routes.DASHBOARD) {
             com.parking.stone.ui.screens.DashboardScreen(navController)
        }
        composable(com.parking.stone.ui.Routes.ENTRY) {
            com.parking.stone.ui.screens.EntryScreen(navController)
        }
        composable(com.parking.stone.ui.Routes.CASH_CLOSING) {
            com.parking.stone.ui.screens.CashClosingScreen(navController)
        }
        composable(
            route = com.parking.stone.ui.Routes.EXIT + "?plate={plate}",
            arguments = listOf(
                androidx.navigation.navArgument("plate") { 
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val plate = backStackEntry.arguments?.getString("plate")
            com.parking.stone.ui.screens.ExitScreen(navController, plate)
        }
        composable(com.parking.stone.ui.Routes.CANCEL_TICKET) {
            com.parking.stone.ui.screens.CancelTicketScreen(navController)
        }
        composable(com.parking.stone.ui.Routes.REPRINT_TICKET) {
            com.parking.stone.ui.screens.ReprintTicketScreen(navController)
        }
    }
}
