"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Menu } from "lucide-react"
import { Overview } from "@/components/overview"
import { Transactions } from "@/components/transactions"
import { Transfer } from "@/components/transfer"
import { DataExport } from "@/components/data-export"
import { BulkImport } from "@/components/bulk-import"
import { Settings } from "@/components/settings"
import { TransactionHistory } from "@/components/transaction-history"
import { FloatingAddButton } from "@/components/floating-add-button"
import { Sidebar } from "@/components/sidebar"
import { apiClient } from "@/lib/api-client"

interface DashboardProps {
  onLogout: () => void
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactionHistoryProps, setTransactionHistoryProps] = useState<{
    accountId?: string
    accountName?: string
    categoryId?: string
    categoryName?: string
  } | null>(null)

  const handleLogout = () => {
    apiClient.clearSession()
    onLogout()
  }

  const showTransactionHistory = (props: {
    accountId?: string
    accountName?: string
    categoryId?: string
    categoryName?: string
  }) => {
    setTransactionHistoryProps(props)
    setActiveTab("transaction-history")
  }

  const hideTransactionHistory = () => {
    setTransactionHistoryProps(null)
    setActiveTab("overview")
  }

  const renderContent = () => {
    if (activeTab === "transaction-history" && transactionHistoryProps) {
      return <TransactionHistory {...transactionHistoryProps} onBack={hideTransactionHistory} />
    }

    switch (activeTab) {
      case "overview":
        return <Overview onShowTransactionHistory={showTransactionHistory} />
      case "transactions":
        return <Transactions />
      case "transfer":
        return <Transfer />
      case "settings":
        return <Settings />
      case "export":
        return <DataExport />
      case "import":
        return <BulkImport />
      default:
        return <Overview onShowTransactionHistory={showTransactionHistory} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">

      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-neutral-200/50 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-neutral-800">Money Manager</h1>
              <p className="text-xs text-neutral-500 capitalize">{activeTab.replace("-", " ")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-600">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <div className="animate-fade-in">{renderContent()}</div>
          </div>
        </main>
      </div>

      <FloatingAddButton
        onAddTransaction={() => {
          setActiveTab("transactions")
          setSidebarOpen(false)
        }}
        onAddTransfer={() => {
          setActiveTab("transfer")
          setSidebarOpen(false)
        }}
        onAddAccount={() => {
          setActiveTab("settings")
          setSidebarOpen(false)
        }}
        onAddBudget={() => {
          setActiveTab("settings")
          setSidebarOpen(false)
        }}
      />
    </div>
  )
}
