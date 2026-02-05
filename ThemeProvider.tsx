import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState
} from 'react'
import { ThemeContext } from './ThemeContext'
import type { Theme } from './types'

export const THEME_KEY = 'theme'

/* NOTE: globalThis is a modern JavaScript standard (ES2020) that automatically references the global object in any environment:
  - In the browser, globalThis === window.
  - In Node.js, globalThis === global.
  - In Web Workers, globalThis === self.*/

/**
 * Global Theme Provider component.
 *
 * Manages the application's theme state (light/dark), automatically synchronizes
 * with `localStorage` and system preferences, and handles cross-tab synchronization.
 *
 * @component
 * @example
 * // Wrap the root application component:
 * <ThemeProvider>
 * <App />
 * </ThemeProvider>
 *
 * @param {Object} props - Component properties.
 * @param {ReactNode} props.children - Child components that will have access to the theme context.
 */
export const ThemeProvider = ({
	children
}: {
	readonly children: ReactNode
}) => {
	/**
	 * Current theme state.
	 *
	 * Uses lazy initialization to improve performance.
	 * Priority order for theme selection:
	 * 1. Saved value in localStorage.
	 * 2. System preference (prefers-color-scheme).
	 * 3. Default fallback ('light').
	 */
	const [theme, setTheme] = useState<Theme>(() => {
		const savedTheme = localStorage.getItem(THEME_KEY) as Theme
		if (savedTheme) return savedTheme

		return globalThis.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light'
	})

	/**
	 * Effect to apply the theme to the DOM.
	 *
	 * Uses `useLayoutEffect` to apply the class synchronously before the browser paints.
	 * This prevents the "Flash of Unstyled Content" (FOUC) or flickering issues.
	 */
	useLayoutEffect(() => {
		const root = globalThis.document.documentElement
		root.classList.remove('light', 'dark')
		root.classList.add(theme)
		localStorage.setItem(THEME_KEY, theme)
	}, [theme])

	/**
	 * Effect for cross-tab synchronization.
	 *
	 * Listens for the `storage` event on `globalThis`. If the theme is changed in
	 * another tab, this effect updates the state in the current tab immediately.
	 */
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (
				e.key === THEME_KEY &&
				(e.newValue === 'light' || e.newValue === 'dark')
			) {
				setTheme(e.newValue)
			}
		}

		globalThis.addEventListener('storage', handleStorageChange)
		return () => globalThis.removeEventListener('storage', handleStorageChange)
	}, [])

	/**
	 * Toggles the theme between 'light' and 'dark'.
	 * Memoized via `useCallback` to maintain a stable reference.
	 */
	const toggleTheme = useCallback(() => {
		setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
	}, [])

	/**
	 * The context value exposed to consumers.
	 *
	 * Memoized via `useMemo` to prevent unnecessary re-renders of child components
	 * unless `theme` explicitly changes.
	 *
	 * @type {{ theme: Theme, isDark: boolean, toggleTheme: () => void }}
	 */
	const contextValue = useMemo(
		() => ({
			theme,
			isDark: theme === 'dark',
			toggleTheme
		}),
		[theme, toggleTheme]
	)

	return (
		<ThemeContext.Provider value={contextValue}>
			{children}
		</ThemeContext.Provider>
	)
}
