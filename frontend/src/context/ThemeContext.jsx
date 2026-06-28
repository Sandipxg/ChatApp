import { createContext , useState} from "react"

const ThemeContext = createContext("light")

export function ThemeProvider({children}){
    const [theme,setTheme] = useState(() => localStorage.getItem("theme") || "light")

    function handleSetTheme(value) {
      localStorage.setItem("theme", value)
      setTheme(value)
    }

    return(
        <ThemeContext.Provider value={{theme, setTheme: handleSetTheme}}>
            {children}
        </ThemeContext.Provider>
    )
}

export default ThemeContext
