package expo.modules.installreferrer

import android.content.Context
import android.os.RemoteException
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoInstallReferrerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ExpoInstallReferrer")

    AsyncFunction("getInstallReferrerAsync") { promise: Promise ->
      val client = InstallReferrerClient.newBuilder(context).build()
      var settled = false

      fun reject(code: String, message: String, cause: Throwable? = null) {
        if (settled) return
        settled = true
        client.endConnection()
        promise.reject(code, message, cause)
      }

      client.startConnection(object : InstallReferrerStateListener {
        override fun onInstallReferrerSetupFinished(responseCode: Int) {
          if (settled) return
          if (responseCode != InstallReferrerClient.InstallReferrerResponse.OK) {
            reject("ERR_INSTALL_REFERRER_$responseCode", "Google Play Install Referrer unavailable: $responseCode")
            return
          }

          try {
            val details = client.installReferrer
            settled = true
            client.endConnection()
            promise.resolve(mapOf(
              "rawReferrer" to details.installReferrer,
              "referrerClickTimestampSeconds" to details.referrerClickTimestampSeconds,
              "referrerClickTimestampServerSeconds" to details.referrerClickTimestampServerSeconds,
              "installBeginTimestampSeconds" to details.installBeginTimestampSeconds,
              "installBeginTimestampServerSeconds" to details.installBeginTimestampServerSeconds,
              "installVersion" to details.installVersion,
              "googlePlayInstant" to details.googlePlayInstantParam
            ))
          } catch (error: RemoteException) {
            reject("ERR_INSTALL_REFERRER_REMOTE", "Unable to read Google Play Install Referrer", error)
          } catch (error: SecurityException) {
            reject("ERR_INSTALL_REFERRER_PERMISSION", "Google Play denied Install Referrer access", error)
          }
        }

        override fun onInstallReferrerServiceDisconnected() {
          reject("ERR_INSTALL_REFERRER_DISCONNECTED", "Google Play Install Referrer disconnected")
        }
      })
    }
  }
}
