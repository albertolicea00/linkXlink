import { createContext, useContext, type ReactNode } from 'react'

/** True when this keep-alive host is the visible route. Default true for pages that aren't cached. */
const KeepAliveContext = createContext(true)

export function useKeepAliveActive(): boolean {
  return useContext(KeepAliveContext)
}

export function KeepAliveHost({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <KeepAliveContext.Provider value={active}>
      <div className="keep-alive-host" hidden={!active} {...(!active ? { inert: true } : {})}>
        {children}
      </div>
    </KeepAliveContext.Provider>
  )
}
