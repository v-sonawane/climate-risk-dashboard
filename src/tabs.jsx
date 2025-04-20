import * as React from "react"

const TabsContext = React.createContext(null)

export function Tabs({ defaultValue, children, ...props }) {
  const [value, setValue] = React.useState(defaultValue)
  
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className="w-full" {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, ...props }) {
  return (
    <div 
      className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600"
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, ...props }) {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  
  const isActive = context.value === value
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
        ${isActive 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-600 hover:text-gray-900"
        }`}
      onClick={() => context.setValue(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, ...props }) {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  
  return context.value === value ? (
    <div className="mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2" {...props}>
      {children}
    </div>
  ) : null
}