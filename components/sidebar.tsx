"use client"

import { Button } from "@/components/ui/button"
import { Home, Receipt, ArrowRightLeft, Upload, Download, SettingsIcon, LogOut, X, Sparkles } from "lucide-react"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onLogout: () => void
}

export function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: Home, gradient: "gradient-purple" },
    { id: "transactions", label: "Transactions", icon: Receipt, gradient: "gradient-green" },
    { id: "transfer", label: "Transfer", icon: ArrowRightLeft, gradient: "gradient-orange" },
    { id: "import", label: "Import Data", icon: Upload, gradient: "gradient-purple" },
    { id: "export", label: "Export Data", icon: Download, gradient: "gradient-blue" },
    { id: "settings", label: "Settings", icon: SettingsIcon, gradient: "gradient-pink" },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-md border-r border-neutral-200/50 z-30">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800">Money Manager</h1>
              <p className="text-xs text-neutral-500">Personal Finance</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `${item.gradient} text-white shadow-lg scale-105`
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start h-12 rounded-xl text-neutral-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-md border-r border-neutral-200/50 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800">Money Manager</h1>
                <p className="text-xs text-neutral-500">Personal Finance</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    setActiveTab(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `${item.gradient} text-white shadow-lg`
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start h-12 rounded-xl text-neutral-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  )
}
