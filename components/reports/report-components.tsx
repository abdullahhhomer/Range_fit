"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartData {
  label: string
  value: number
  color?: string
  percentage?: number
}

interface ReportChartProps {
  title: string
  data: ChartData[]
  type: 'pie' | 'bar' | 'line'
  icon?: React.ReactNode
  className?: string
}

export function ReportChart({ title, data, type, icon, className = '' }: ReportChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  
  const getColor = (index: number) => {
    const colors = [
      'bg-orange-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500'
    ]
    return colors[index % colors.length]
  }

  const renderPieChart = () => (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${getColor(index)}`}></div>
            <div>
              <span className="text-white font-medium">{item.label}</span>
              <p className="text-gray-400 text-sm">{item.value} items</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-white font-bold">{item.value}</span>
            <p className="text-gray-400 text-sm">
              {item.percentage ? `${item.percentage.toFixed(1)}%` : 
               maxValue > 0 ? `${((item.value / maxValue) * 100).toFixed(1)}%` : '0%'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">{item.label}</span>
            <span className="text-white font-bold">{item.value}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`${getColor(index)} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderLineChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">{item.label}</span>
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-700 rounded-full h-2">
              <div 
                className={`${getColor(index)} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-white font-bold w-12 text-right">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return renderPieChart()
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      default:
        return renderPieChart()
    }
  }

  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: string
  trendColor?: string
  className?: string
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  trend, 
  trendColor = 'text-gray-400',
  className = '' 
}: StatCardProps) {
  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendColor}`}>{trend}</p>
            )}
          </div>
          <div className={color}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ReportTableProps {
  title: string
  data: Record<string, any>[]
  columns: {
    key: string
    label: string
    render?: (value: any, row: any) => React.ReactNode
  }[]
  icon?: React.ReactNode
  className?: string
  maxRows?: number
}

export function ReportTable({ 
  title, 
  data, 
  columns, 
  icon, 
  className = '',
  maxRows = 20 
}: ReportTableProps) {
  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {icon}
          {title} ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {columns.map(column => (
                  <th key={column.key} className="text-left p-3 text-gray-300 font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, maxRows).map((row, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  {columns.map(column => (
                    <td key={column.key} className="p-3">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > maxRows && (
            <div className="text-center mt-4">
              <p className="text-gray-400">Showing first {maxRows} results. Use filters to narrow down results.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface FilterCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function FilterCard({ title, icon, children, className = '' }: FilterCardProps) {
  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

interface ExportButtonProps {
  onExport: () => void
  format: 'CSV' | 'PDF' | 'Excel'
  className?: string
}

export function ExportButton({ onExport, format, className = '' }: ExportButtonProps) {
  const getColor = () => {
    switch (format) {
      case 'CSV':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'PDF':
        return 'bg-red-600 hover:bg-red-700'
      case 'Excel':
        return 'bg-green-600 hover:bg-green-700'
      default:
        return 'bg-gray-600 hover:bg-gray-700'
    }
  }

  return (
    <button
      onClick={onExport}
      className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${getColor()} ${className}`}
    >
      Export {format}
    </button>
  )
}

