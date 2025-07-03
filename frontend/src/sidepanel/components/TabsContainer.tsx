import { useState, ReactNode } from "react"
import { useLocale } from "../../lib/i18n"

interface TabData {
  id: string
  label: string
  content: ReactNode
  icon?: string
}

interface TabsContainerProps {
  tabs: TabData[]
  defaultTab?: string
}

export function TabsContainer({ tabs, defaultTab }: TabsContainerProps) {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  return (
    <div className="vix-w-full">
      <div className="vix-border-b vix-border-gray-200 vix-mb-4">
        <nav className="vix-flex vix-space-x-8" aria-label={t("main_navigation")}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`vix-py-2 vix-px-1 vix-border-b-2 vix-font-medium vix-text-sm vix-flex vix-items-center vix-gap-2 vix-transition-colors ${
                activeTab === tab.id
                  ? "vix-border-blue-500 vix-text-blue-600"
                  : "vix-border-transparent vix-text-gray-500 hover:vix-text-gray-700 hover:vix-border-gray-300"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div role="tabpanel" aria-labelledby={activeTab}>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}