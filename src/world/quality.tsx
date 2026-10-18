import { createContext, useContext } from 'react'
import { renderBudget, createQuality, type RenderBudget } from '../core/quality'

/** Current render budget for world components (lights, particle counts). */
export const QualityContext = createContext<RenderBudget>(renderBudget(createQuality('high')))

export const useRenderBudget = () => useContext(QualityContext)
