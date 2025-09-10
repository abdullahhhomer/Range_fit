"use client"

import { useState } from "react"
import { setupDefaultAdmin } from "../../scripts/setup-admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSetup = async () => {
    setStatus("loading")
    setMessage("")

    try {
      const success = await setupDefaultAdmin()
      if (success) {
        setStatus("success")
        setMessage("Admin account created successfully!")
      } else {
        setStatus("error")
        setMessage("Failed to create admin account")
      }
    } catch (error) {
      setStatus("error")
      setMessage("An error occurred during setup")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Range Fit Setup</CardTitle>
          <CardDescription className="text-gray-300">Create your default admin account to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "idle" && (
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Default Admin Credentials:</h3>
                <p className="text-sm text-gray-300">Email: admin@rangefit.com</p>
                <p className="text-sm text-gray-300">Password: admin123</p>
              </div>
              <Button onClick={handleSetup} className="w-full bg-orange-600 hover:bg-orange-700">
                Create Admin Account
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-gray-300">Creating admin account...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-green-400">{message}</p>
              <div className="bg-green-900/20 border border-green-500/20 p-4 rounded-lg">
                <p className="text-sm text-green-300">You can now login with:</p>
                <p className="text-sm font-mono text-green-200">admin@rangefit.com</p>
                <p className="text-sm font-mono text-green-200">admin123</p>
              </div>
              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-400">{message}</p>
              <Button
                onClick={handleSetup}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
