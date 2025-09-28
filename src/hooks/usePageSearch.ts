import { useState, useCallback, useEffect } from 'react'
import type { SearchState, SearchResult } from '../types/search'

export const usePageSearch = () => {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    currentIndex: 0,
    isOpen: false,
    total: 0
  })

  // ล้างการค้นหา
  const clear = useCallback(() => {
    if (typeof document !== 'undefined') {
      // ลบ highlight ที่เราสร้างขึ้น
      const highlights = document.querySelectorAll('.search-highlight')
      highlights.forEach(highlight => {
        const parent = highlight.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight)
          parent.normalize()
        }
      })
    }

    setState({
      query: '',
      results: [],
      currentIndex: 0,
      isOpen: false,
      total: 0
    })
  }, [])

  // อัปเดต highlight สำหรับคำที่เลือก
  const updateHighlights = useCallback((results: SearchResult[], currentIndex: number) => {
    if (typeof document === 'undefined') return

    // วนลูปผ่าน results และเปลี่ยน classes ของ element โดยตรง
    results.forEach((result, resultIndex) => {
      if (result.element && result.element instanceof HTMLSpanElement) {
        const isCurrent = resultIndex === currentIndex
        
        // ลบ classes เก่า
        result.element.className = 'search-highlight'
        
        // เพิ่ม classes ใหม่
        if (isCurrent) {
          result.element.classList.add(
            'bg-orange-500', 
            'dark:bg-orange-400',
            'text-white', 
            'px-1', 
            'rounded', 
            'font-medium', 
            'border-2', 
            'border-orange-600',
            'dark:border-orange-500',
            'shadow-lg'
          )
        } else {
          result.element.classList.add(
            'bg-blue-200', 
            'dark:bg-blue-800',
            'text-blue-900', 
            'dark:text-blue-100',
            'px-1', 
            'rounded', 
            'font-medium',
            'border',
            'border-blue-300',
            'dark:border-blue-600'
          )
        }
      }
    })
  }, [])

  // ค้นหาข้อความในหน้า
  const search = useCallback((query: string) => {
    if (!query.trim()) {
      clear()
      return
    }

    // ต้องพิมพ์อย่างน้อย 2 ตัวอักษรค่อยเริ่มค้นหา
    if (query.trim().length < 2) {
      clear()
      return
    }

    if (typeof document === 'undefined') return

    // ลบ highlight เก่าก่อน
    clear()

    // ค้นหาในเนื้อหาทั้งหมด
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // ข้าม search box และ elements ที่เป็น search-highlight อยู่แล้ว
          const parent = node.parentElement
          if (parent?.closest('.search-bar, .search-highlight')) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    const results: SearchResult[] = []
    const nodesToProcess: Text[] = []

    // เก็บ text nodes ทั้งหมดก่อน
    let node: Text | null
    while (node = walker.nextNode() as Text) {
      nodesToProcess.push(node)
    }

    // ประมวลผล text nodes
    nodesToProcess.forEach((textNode) => {
      const text = textNode.textContent || ''
      if (!text.trim()) return

      // ใช้ regex ที่รองรับ whitespace และ special characters
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedQuery, 'gi')
      let match
      let lastIndex = 0
      const fragments: (Text | HTMLSpanElement)[] = []

      while ((match = regex.exec(text)) !== null) {
        // สร้าง text node ก่อน match
        if (match.index > lastIndex) {
          const beforeText = text.substring(lastIndex, match.index)
          fragments.push(document.createTextNode(beforeText))
        }

        // สร้าง span element สำหรับ highlight
        const span = document.createElement('span')
        span.className = 'search-highlight'
        span.textContent = match[0]
        fragments.push(span)

        // เพิ่มเข้า results
        results.push({
          text: match[0],
          element: span,
          index: results.length,
          query: query,
          textNode: null
        })

        lastIndex = match.index + match[0].length
      }

      // เพิ่ม text ที่เหลือ
      if (lastIndex < text.length) {
        const afterText = text.substring(lastIndex)
        fragments.push(document.createTextNode(afterText))
      }

      // แทนที่ text node เดิมด้วย fragments ใหม่
      if (fragments.length > 0) {
        const parent = textNode.parentNode
        if (parent) {
          // แทรก fragments ใหม่
          fragments.forEach(fragment => {
            parent.insertBefore(fragment, textNode)
          })
          // ลบ text node เดิม
          parent.removeChild(textNode)
        }
      }
    })

    // Highlight ผลลัพธ์
    if (results.length > 0) {
      updateHighlights(results, 0) // เริ่มต้นที่คำแรก

      // Scroll ไปผลลัพธ์แรก
      if (results[0]?.element) {
        results[0].element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    setState({
      query,
      results,
      currentIndex: 0,
      total: results.length,
      isOpen: true
    })
  }, [clear, updateHighlights])

  // ไปผลลัพธ์ถัดไป
  const next = useCallback(() => {
    if (state.total === 0) return

    const nextIndex = (state.currentIndex + 1) % state.total
    
    // อัปเดต highlight
    updateHighlights(state.results, nextIndex)

    // Scroll ไปผลลัพธ์ใหม่
    const result = state.results[nextIndex]
    if (result?.element) {
      result.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    setState(prev => ({
      ...prev,
      currentIndex: nextIndex
    }))
  }, [state.currentIndex, state.total, state.results, updateHighlights])

  // ไปผลลัพธ์ก่อนหน้า
  const previous = useCallback(() => {
    if (state.total === 0) return

    const prevIndex = state.currentIndex === 0 ? state.total - 1 : state.currentIndex - 1
    
    // อัปเดต highlight
    updateHighlights(state.results, prevIndex)

    // Scroll ไปผลลัพธ์ใหม่
    const result = state.results[prevIndex]
    if (result?.element) {
      result.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    setState(prev => ({
      ...prev,
      currentIndex: prevIndex
    }))
  }, [state.currentIndex, state.total, state.results, updateHighlights])

  // Toggle search
  const toggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: !prev.isOpen
    }))
  }, [])

  // ปิด search
  const close = useCallback(() => {
    clear()
  }, [clear])

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘F / Ctrl+F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        toggle()
      }

      // Escape
      if (e.key === 'Escape' && state.isOpen) {
        close()
      }

      // Arrow Down / Enter (next)
      if ((e.key === 'ArrowDown' || e.key === 'Enter') && state.isOpen && state.total > 0) {
        e.preventDefault()
        next()
      }

      // Arrow Up / Shift+Enter (previous)
      if ((e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) && state.isOpen && state.total > 0) {
        e.preventDefault()
        previous()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle, close, next, previous, state.isOpen, state.total])

  return {
    state,
    search,
    next,
    previous,
    clear,
    toggle,
    close
  }
}