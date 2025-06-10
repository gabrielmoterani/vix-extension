const fs = require("fs")
const path = require("path")

const directoryToScan = path.resolve(__dirname, "src") // ajuste conforme necessário
const tailwindPrefix = "vix-"

const classRegex = /(class(Name)?\s*=\s*{?["'`])([^"'`]+)(["'`])/g

const prefixClass = (cls) => {
  if (
    cls.startsWith(tailwindPrefix) ||
    cls.startsWith("[") ||
    cls.startsWith("{") ||
    cls.startsWith("--") ||
    cls.startsWith("http") ||
    cls.match(/^[a-zA-Z0-9-_]+\[.*\]$/)
  ) {
    return cls
  }

  if (cls.includes(":")) {
    const [prefix, value] = cls.split(":")
    return `${prefix}:${prefixClass(value)}`
  }

  return tailwindPrefix + cls
}

function transformClassNames(classString) {
  return classString
    .trim()
    .split(/\s+/)
    .map(prefixClass)
    .join(" ")
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8")
  let modified = false

  const updatedContent = content.replace(classRegex, (match, start, _name, classValue, end) => {
    const transformed = transformClassNames(classValue)
    if (transformed !== classValue) {
      modified = true
    }
    return `${start}${transformed}${end}`
  })

  if (modified) {
    fs.writeFileSync(filePath, updatedContent, "utf8")
    console.log(`✅ Atualizado: ${filePath}`)
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath)
    } else if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      processFile(fullPath)
    }
  }
}

walk(directoryToScan)
console.log("🏁 Prefixo 'vix-' aplicado onde necessário.")
