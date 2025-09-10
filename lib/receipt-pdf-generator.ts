import { ReceiptData } from "./firebase/receipt-management"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Timestamp } from 'firebase/firestore'

// Helper function to format dates
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

// Generate PDF content for receipt
export const generateReceiptPDF = (receipt: ReceiptData): string => {

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`
  }

  const html = `
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
            color: #000000;
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
            background: #ff6b35;
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

  return html
}

// Download receipt as PDF using the beautiful HTML template
export const downloadReceiptPDF = async (receipt: ReceiptData) => {
  try {
    const html = generateReceiptPDF(receipt)
    
    // Create a completely isolated iframe to prevent any side effects
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '800px'
    iframe.style.height = '1200px'
    iframe.style.border = 'none'
    iframe.style.backgroundColor = 'white'
    document.body.appendChild(iframe)
    
    // Write the HTML content to the iframe
    iframe.contentDocument?.write(html)
    iframe.contentDocument?.close()
    
    // Wait for the iframe to load
    await new Promise(resolve => {
      iframe.onload = resolve
    })
    
    // Get the iframe document body
    const iframeBody = iframe.contentDocument?.body
    if (!iframeBody) {
      throw new Error('Failed to create iframe content')
    }
    
    // Convert HTML to canvas using the iframe content
    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: iframeBody.scrollHeight,
      logging: false,
      foreignObjectRendering: false
    })
    
    // Remove the iframe
    document.body.removeChild(iframe)
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    
    let position = 0
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    // Download the PDF
    pdf.save(`receipt-${receipt.receiptNumber}.pdf`)
    
    console.log(`✅ Receipt downloaded as PDF: ${receipt.receiptNumber}`)
  } catch (error) {
    console.error("Error downloading receipt:", error)
    throw error
  }
}

// Alternative: Generate PDF using browser print functionality (simplified)
export const printReceipt = (receipt: ReceiptData) => {
  try {
    // Create a simple HTML for printing without complex CSS
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${receipt.receiptNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #ffffff;
            color: #000000;
          }
          .receipt {
            max-width: 600px;
            margin: 0 auto;
            border: 2px solid #ff6b35;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            background-color: #ff6b35;
            color: #ffffff;
            padding: 20px;
            margin: -20px -20px 20px -20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 14px;
          }
          .receipt-title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            border-bottom: 2px solid #ff6b35;
            padding-bottom: 10px;
          }
          .info-section {
            margin: 20px 0;
          }
          .info-section h3 {
            color: #ff6b35;
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
          }
          .info-label {
            font-weight: bold;
            color: #555555;
          }
          .info-value {
            color: #333333;
          }
          .amount-section {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
          }
          .amount-label {
            font-size: 16px;
            color: #555555;
            margin-bottom: 10px;
          }
          .amount-value {
            font-size: 28px;
            font-weight: bold;
            color: #ff6b35;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #cccccc;
            font-size: 12px;
            color: #666666;
          }
          @media print {
            body { margin: 0; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">RangeFit Gym</div>
            <div class="subtitle">Transform Your Life, Transform Your Body</div>
          </div>
          
          <div class="receipt-title">MEMBERSHIP RECEIPT</div>
          
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
          
          <div class="amount-section">
            <div class="amount-label">Total Amount Paid</div>
            <div class="amount-value">Rs. ${receipt.amount.toLocaleString()}</div>
          </div>
          
          <div class="footer">
            <div>Thank you for choosing RangeFit Gym!</div>
            <div>Al Harmain Plaza, Range Rd, Rawalpindi, Pakistan</div>
            <div>Phone: ${receipt.gymPhone} | Email: ${receipt.gymEmail}</div>
            <div>Generated on: ${formatDate(receipt.createdAt)}</div>
          </div>
        </div>
      </body>
      </html>
    `
    
    // Create a new window with the receipt content
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
      }
    }
    
    console.log(`✅ Receipt printed: ${receipt.receiptNumber}`)
  } catch (error) {
    console.error("Error printing receipt:", error)
    throw error
  }
}

// Simple PDF generation method that avoids all HTML/CSS issues
export const downloadReceiptPDFSimple = async (receipt: ReceiptData) => {
  try {
    // Create a simple PDF using jsPDF directly
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    // Set font
    pdf.setFont('helvetica')
    
    // Header with orange background
    pdf.setFillColor(255, 107, 53) // RGB orange
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.text('RangeFit Gym', 105, 20, { align: 'center' })
    pdf.setFontSize(12)
    pdf.text('Transform Your Life, Transform Your Body', 105, 30, { align: 'center' })
    
    // Reset text color and add title
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(18)
    pdf.text('MEMBERSHIP RECEIPT', 105, 55, { align: 'center' })
    
    // Receipt details
    pdf.setFontSize(12)
    pdf.text(`Receipt #: ${receipt.receiptNumber}`, 20, 75)
    pdf.text(`Date: ${formatDate(receipt.createdAt)}`, 20, 85)
    pdf.text(`Transaction ID: ${receipt.transactionId}`, 20, 95)
    
    // Customer info
    pdf.setFontSize(14)
    pdf.text('Customer Information:', 20, 115)
    pdf.setFontSize(12)
    pdf.text(`Name: ${receipt.customerName}`, 20, 125)
    pdf.text(`Member ID: ${receipt.memberId}`, 20, 135)
    
    // Membership details
    pdf.setFontSize(14)
    pdf.text('Membership Details:', 20, 155)
    pdf.setFontSize(12)
    pdf.text(`Plan Type: ${receipt.membershipType}`, 20, 165)
    pdf.text(`Start Date: ${formatDate(receipt.startDate)}`, 20, 175)
    pdf.text(`End Date: ${formatDate(receipt.endDate)}`, 20, 185)
    pdf.text(`Payment Method: ${receipt.paymentMethod}`, 20, 195)
    
    // Amount section
    pdf.setFillColor(248, 249, 250) // Light gray background
    pdf.rect(15, 205, 180, 25, 'F')
    pdf.setFontSize(16)
    pdf.text('Total Amount Paid:', 20, 215)
    pdf.setFontSize(20)
    pdf.setTextColor(255, 107, 53) // Orange color
    pdf.text(`Rs. ${receipt.amount.toLocaleString()}`, 20, 225)
    
    // Footer
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.text('Thank you for choosing RangeFit Gym!', 105, 250, { align: 'center' })
    pdf.text('Al Harmain Plaza, Range Rd, Rawalpindi, Pakistan', 105, 255, { align: 'center' })
    pdf.text(`Phone: ${receipt.gymPhone} | Email: ${receipt.gymEmail}`, 105, 260, { align: 'center' })
    pdf.text(`Generated on: ${formatDate(receipt.createdAt)}`, 105, 265, { align: 'center' })
    
    // Download the PDF
    pdf.save(`receipt-${receipt.receiptNumber}.pdf`)
    
    console.log(`✅ Receipt downloaded as PDF (simple): ${receipt.receiptNumber}`)
  } catch (error) {
    console.error("Error downloading receipt (simple):", error)
    throw error
  }
}
