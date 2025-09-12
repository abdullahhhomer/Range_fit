"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Calendar,
  Banknote,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { ExpenseRecord } from '@/lib/firebase'

type ExpenseCategory = 'Utility Bills' | 'Staff Fee' | 'Equipment' | 'Maintenance' | 'Marketing' | 'Other'

interface RecentExpensesTableProps {
  expenses: ExpenseRecord[]
  onExpenseUpdate: (expenseId: string, updatedExpense: Partial<ExpenseRecord>) => Promise<void>
  onExpenseDelete: (expenseId: string) => Promise<void>
}

interface ViewExpensePopupProps {
  expense: ExpenseRecord
  onClose: () => void
}

interface EditExpensePopupProps {
  expense: ExpenseRecord
  onClose: () => void
  onSave: (updatedExpense: Partial<ExpenseRecord>) => Promise<void>
}

interface DeleteExpensePopupProps {
  expense: ExpenseRecord
  onClose: () => void
  onConfirm: () => Promise<void>
}

const ViewExpensePopup: React.FC<ViewExpensePopupProps> = ({ expense, onClose }) => {
  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-center sticky top-0">
          <h3 className="text-lg sm:text-xl font-bold text-white">View Expense</h3>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Expense Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <label className="text-gray-300 text-sm font-medium mb-3 block">Expense Details</label>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Title</label>
                <div className="text-white font-medium text-base">{expense.title}</div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Category</label>
                <Badge className={
                  expense.category === 'Utility Bills' ? 'bg-blue-600' :
                  expense.category === 'Staff Fee' ? 'bg-green-600' :
                  expense.category === 'Equipment' ? 'bg-purple-600' :
                  expense.category === 'Maintenance' ? 'bg-orange-600' :
                  expense.category === 'Marketing' ? 'bg-pink-600' :
                  'bg-gray-600'
                }>
                  {expense.category}
                </Badge>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Amount</label>
                <div className="text-red-400 font-bold text-xl">{formatCurrency(expense.amount)}</div>
              </div>
              {expense.description && (
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Description</label>
                  <div className="text-gray-300 text-sm">{expense.description}</div>
                </div>
              )}
              <div>
                <label className="text-gray-400 text-sm block mb-2">Date</label>
                <div className="text-gray-300 text-sm">{formatDate(expense.createdAt)}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

const EditExpensePopup: React.FC<EditExpensePopupProps> = ({ expense, onClose, onSave }) => {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<{
    title: string
    amount: string
    category: ExpenseCategory
    description: string
  }>({
    title: expense.title,
    amount: expense.amount.toString(),
    category: expense.category,
    description: expense.description || ''
  })

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.amount.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category as ExpenseRecord['category'],
        description: formData.description.trim()
      })
      toast.success('Expense updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between sticky top-0">
          <h3 className="text-lg sm:text-xl font-bold text-white">Edit Expense</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 min-w-[40px] min-h-[40px]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Expense Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <label className="text-gray-300 text-sm font-medium mb-3 block">Expense Information</label>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Expense Title *</label>
                <Input
                  placeholder="e.g., Electricity Bill, Staff Salary"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  disabled={isSaving}
                  className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Amount (PKR) *</label>
                <Input
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  type="number"
                  disabled={isSaving}
                  className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Category</label>
                <div className="relative">
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                    disabled={isSaving}
                    className={`w-full h-12 px-4 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white text-base appearance-none ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="Utility Bills">Utility Bills</option>
                    <option value="Staff Fee">Staff Fee</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Description (Optional)</label>
                <Input
                  placeholder="Additional details about the expense"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={isSaving}
                  className={`w-full h-12 px-4 bg-gray-700 border-gray-600 text-white text-base ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || !formData.amount.trim() || isSaving}
              className={`flex-1 h-12 text-base font-semibold rounded-lg transition-all duration-200 ${
                isSaving 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white flex items-center justify-center gap-2`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  Update Expense
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className={`flex-1 h-12 text-base rounded-lg transition-all duration-200 ${
                isSaving 
                  ? 'border-gray-400 text-gray-400 cursor-not-allowed bg-gray-100' 
                  : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 bg-white'
              }`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DeleteExpensePopup: React.FC<DeleteExpensePopupProps> = ({ expense, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      toast.success('Expense deleted successfully')
      onClose()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-white">Delete Expense</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 min-w-[40px] min-h-[40px]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/20 rounded-full">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h4 className="text-red-400 font-semibold">Confirm Deletion</h4>
            </div>
            <p className="text-gray-300 text-sm">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
          </div>

          {/* Expense Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h5 className="text-white font-medium mb-2">Expense Details:</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Title:</span>
                <span className="text-white">{expense.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="text-white">{expense.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-red-400 font-semibold">{formatCurrency(expense.amount)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`flex-1 h-12 text-base font-semibold rounded-lg transition-all duration-200 ${
                isDeleting 
                  ? 'bg-red-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white flex items-center justify-center gap-2`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Delete Expense
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className={`flex-1 h-12 text-base rounded-lg transition-all duration-200 ${
                isDeleting 
                  ? 'border-gray-400 text-gray-400 cursor-not-allowed bg-gray-100' 
                  : 'border-orange-500/50 text-orange-400 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-600 hover:scale-105 bg-white'
              }`}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const RecentExpensesTable: React.FC<RecentExpensesTableProps> = ({ 
  expenses, 
  onExpenseUpdate, 
  onExpenseDelete 
}) => {
  const [viewExpense, setViewExpense] = useState<ExpenseRecord | null>(null)
  const [editExpense, setEditExpense] = useState<ExpenseRecord | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<ExpenseRecord | null>(null)

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleUpdateExpense = async (expenseId: string, updatedExpense: Partial<ExpenseRecord>) => {
    await onExpenseUpdate(expenseId, updatedExpense)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    await onExpenseDelete(expenseId)
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Recent Expenses ({expenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-3 text-gray-300 font-medium">Title</th>
                  <th className="text-left py-3 px-3 text-gray-300 font-medium">Category</th>
                  <th className="text-left py-3 px-3 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-3 text-gray-300 font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-3">
                      <div className="text-white font-medium">{expense.title}</div>
                      {expense.description && (
                        <p className="text-gray-400 text-xs mt-1">{expense.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge className={
                        expense.category === 'Utility Bills' ? 'bg-blue-600' :
                        expense.category === 'Staff Fee' ? 'bg-green-600' :
                        expense.category === 'Equipment' ? 'bg-purple-600' :
                        expense.category === 'Maintenance' ? 'bg-orange-600' :
                        expense.category === 'Marketing' ? 'bg-pink-600' :
                        'bg-gray-600'
                      }>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-red-400 font-bold">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-sm">
                            {formatDate(expense.createdAt)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewExpense(expense)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditExpense(expense)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/20 p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteExpense(expense)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No expenses recorded for this period</p>
              </div>
            )}
            {expenses.length > 10 && (
              <div className="text-center mt-4">
                <p className="text-gray-400">Showing first 10 expenses. Use filters to narrow down results.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Expense Popup */}
      {viewExpense && (
        <ViewExpensePopup
          expense={viewExpense}
          onClose={() => setViewExpense(null)}
        />
      )}

      {/* Edit Expense Popup */}
      {editExpense && (
        <EditExpensePopup
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSave={async (updatedExpense) => {
            await handleUpdateExpense(editExpense.id!, updatedExpense)
            setEditExpense(null)
          }}
        />
      )}

      {/* Delete Expense Popup */}
      {deleteExpense && (
        <DeleteExpensePopup
          expense={deleteExpense}
          onClose={() => setDeleteExpense(null)}
          onConfirm={async () => {
            await handleDeleteExpense(deleteExpense.id!)
            setDeleteExpense(null)
          }}
        />
      )}
    </>
  )
}
