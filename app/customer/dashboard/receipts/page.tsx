"use client"

import { useEffect, useState } from "react"
import { CustomerDashboardLayout } from "@/components/customer-dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Receipt, Download, Calendar, FileText, Printer, Eye } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { 
  onUserReceiptsChange, 
  getUserReceiptStats, 
  type ReceiptData 
} from "@/lib/firebase"
import { downloadReceiptPDF, printReceipt } from "@/lib/receipt-pdf-generator"
import { toast } from "sonner"
import { Timestamp } from 'firebase/firestore'

interface ReceiptStats {
  totalPaid: number
  totalReceipts: number
  lastPayment: ReceiptData | null
  lastPaymentDate: Date | null
}

export default function ReceiptsPage() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [stats, setStats] = useState<ReceiptStats>({
    totalPaid: 0,
    totalReceipts: 0,
    lastPayment: null,
    lastPaymentDate: null
  })
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [indexBuilding, setIndexBuilding] = useState(false)

  useEffect(() => {
    if (!user?.uid) return

    // Set up real-time listener for receipts
    const unsubscribe = onUserReceiptsChange(user.uid, (updatedReceipts) => {
      setReceipts(updatedReceipts)
      
      // Calculate stats from updated receipts
      const totalPaid = updatedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0)
      const lastPayment = updatedReceipts.length > 0 ? updatedReceipts[0] : null
      
      setStats({
        totalPaid,
        totalReceipts: updatedReceipts.length,
        lastPayment,
        lastPaymentDate: lastPayment?.createdAt ? (lastPayment.createdAt instanceof Timestamp ? lastPayment.createdAt.toDate() : lastPayment.createdAt) : null
      })
      
      setLoading(false)
      setIndexBuilding(false)
    }, (error) => {
      console.warn("Receipts listener error, index may be building:", error)
      setIndexBuilding(true)
      setLoading(false)
    })

    // Cleanup listener on unmount
    return () => unsubscribe()
  }, [user?.uid])

  const handleDownloadReceipt = async (receipt: ReceiptData) => {
    try {
      setDownloading(receipt.id || "")
      await downloadReceiptPDF(receipt)
      toast.success("Receipt downloaded successfully! 📄", {
        description: `Receipt ${receipt.receiptNumber} has been downloaded.`,
        duration: 4000,
      })
    } catch (error) {
      console.error("Error downloading receipt:", error)
      toast.error("Download failed! 😅", {
        description: "Failed to download receipt. Please try again.",
        duration: 4000,
      })
    } finally {
      setDownloading(null)
    }
  }

  const handlePrintReceipt = async (receipt: ReceiptData) => {
    try {
      await printReceipt(receipt)
      toast.success("Receipt opened for printing! 🖨️", {
        description: `Receipt ${receipt.receiptNumber} is ready to print.`,
        duration: 4000,
      })
    } catch (error) {
      console.error("Error printing receipt:", error)
      toast.error("Print failed! 😅", {
        description: "Failed to open receipt for printing. Please try again.",
        duration: 4000,
      })
    }
  }

  const handleViewReceipt = (receipt: ReceiptData) => {
    // Open receipt in new tab for viewing
    const html = generateReceiptHTML(receipt)
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(html)
      newWindow.document.close()
    }
  }

  const generateReceiptHTML = (receipt: ReceiptData) => {
    const formatDate = (date: Date | Timestamp) => {
      let dateObj: Date;
      if (date instanceof Timestamp) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatCurrency = (amount: number) => {
      return `Rs. ${amount.toLocaleString()}`
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${receipt.receiptNumber}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .gym-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .gym-tagline {
            font-size: 16px;
            opacity: 0.9;
          }
          .receipt-content {
            padding: 40px;
          }
          .receipt-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #ff6b35;
            padding-bottom: 15px;
          }
          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-section h3 {
            color: #ff6b35;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
          }
          .info-label {
            font-weight: 600;
            color: #555;
          }
          .info-value {
            color: #333;
          }
          .amount-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
          }
          .amount-label {
            font-size: 18px;
            color: #555;
            margin-bottom: 10px;
          }
          .amount-value {
            font-size: 32px;
            font-weight: bold;
            color: #ff6b35;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #eee;
          }
          .footer-text {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
          }
          .gym-details {
            margin-top: 15px;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="gym-name">RangeFit Gym</div>
            <div class="gym-tagline">Transform Your Life, Transform Your Body</div>
          </div>
          
          <div class="receipt-content">
            <div class="receipt-title">MEMBERSHIP RECEIPT</div>
            
            <div class="receipt-info">
              <div class="info-section">
                <h3>Customer Information</h3>
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${receipt.customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Member ID:</span>
                  <span class="info-value">${receipt.memberId}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Receipt #:</span>
                  <span class="info-value">${receipt.receiptNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Transaction ID:</span>
                  <span class="info-value">${receipt.transactionId}</span>
                </div>
              </div>
              
              <div class="info-section">
                <h3>Membership Details</h3>
                <div class="info-row">
                  <span class="info-label">Plan Type:</span>
                  <span class="info-value">${receipt.membershipType}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Start Date:</span>
                  <span class="info-value">${formatDate(receipt.startDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">End Date:</span>
                  <span class="info-value">${formatDate(receipt.endDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Method:</span>
                  <span class="info-value">${receipt.paymentMethod}</span>
                </div>
              </div>
            </div>
            
            <div class="amount-section">
              <div class="amount-label">Total Amount Paid</div>
              <div class="amount-value">${formatCurrency(receipt.amount)}</div>
            </div>
            
            <div class="info-section">
              <h3>Payment Summary</h3>
              <div class="info-row">
                <span class="info-label">Membership Fee:</span>
                <span class="info-value">${formatCurrency(receipt.amount)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tax:</span>
                <span class="info-value">Rs. 0</span>
              </div>
              <div class="info-row" style="border-top: 2px solid #ff6b35; padding-top: 10px; font-weight: bold;">
                <span class="info-label">Total:</span>
                <span class="info-value">${formatCurrency(receipt.amount)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              Thank you for choosing RangeFit Gym! This receipt serves as proof of your membership payment.
              Please keep this document for your records.
            </div>
            <div class="gym-details">
              <strong>RangeFit Gym</strong><br>
              Al Harmain Plaza, Range Rd, Rawalpindi, Pakistan<br>
              Phone: ${receipt.gymPhone} | Email: ${receipt.gymEmail}<br>
              Generated on: ${formatDate(receipt.createdAt)}
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  const formatDate = (date: Date | Timestamp) => {
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Receipts & Payment History</h1>
          <p className="text-gray-400">View your payment history and download receipts</p>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Paid</CardTitle>
                              <div className="text-sm font-medium text-orange-400">PKR</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPaid)}</div>
              <p className="text-xs text-gray-400">All time payments</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Last Payment</CardTitle>
              <Calendar className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : "N/A"}
              </div>
              <p className="text-xs text-gray-400">
                {stats.lastPayment ? `${formatCurrency(stats.lastPayment.amount)} - ${stats.lastPayment.membershipType}` : "No payments yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-400" />
              <span>Payment History ({stats.totalReceipts} receipts)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {indexBuilding ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">Building Receipt Index</h3>
                <p className="text-gray-400">Please wait while we prepare your receipts. This may take a few minutes.</p>
                <p className="text-gray-500 text-sm mt-2">You can refresh the page in a few minutes to see your receipts.</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Refresh Page
                </Button>
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No receipts found</h3>
                <p className="text-gray-400">Your payment receipts will appear here once you have active memberships.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Plan</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Receipt #</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="border-b border-gray-700/50">
                        <td className="py-3 px-4 text-white">{formatDate(receipt.createdAt)}</td>
                        <td className="py-3 px-4 text-white font-semibold">{formatCurrency(receipt.amount)}</td>
                        <td className="py-3 px-4 text-gray-300">{receipt.membershipType}</td>
                        <td className="py-3 px-4 text-gray-300 font-mono text-sm">{receipt.receiptNumber}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewReceipt(receipt)}
                              className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-400 bg-transparent transition-all duration-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintReceipt(receipt)}
                              className="text-purple-400 hover:bg-purple-500/10 hover:text-purple-400 bg-transparent transition-all duration-200"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadReceipt(receipt)}
                              disabled={downloading === receipt.id}
                              className="text-orange-400 hover:bg-orange-500/10 hover:text-orange-400 bg-transparent transition-all duration-200"
                            >
                              {downloading === receipt.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerDashboardLayout>
  )
}
