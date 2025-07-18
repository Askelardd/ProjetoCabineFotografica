const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron")
const path = require("path")
const fs = require("fs")
const { exec } = require("child_process")
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "icon.png"),
    titleBarStyle: "default",
    autoHideMenuBar: true,
    fullscreen: false,
    resizable: true,
  })

  // Carregar a aplicação
  if (isDev) {
    // Em desenvolvimento, carrega do servidor Next.js
    mainWindow.loadURL("http://localhost:3000")
    mainWindow.webContents.openDevTools()
  } else {
    // Em produção, carrega do build estático
    const indexPath = path.join(__dirname, "../out/index.html")
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Aguardar a aplicação carregar antes de mostrar
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers para comunicação com o renderer

// Salvar imagem diretamente na pasta do HOTFOLDERPRINT
ipcMain.handle("save-image-to-hotfolder", async (event, imageData, fileName) => {
  try {
    const hotFolderPath = "C:\\DNP\\HotFolderPrint\\Prints\\s2x6\\DS620"

    // Criar pasta se não existir
    if (!fs.existsSync(hotFolderPath)) {
      fs.mkdirSync(hotFolderPath, { recursive: true })
    }

    // Converter base64 para buffer
    const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Salvar arquivo
    const filePath = path.join(hotFolderPath, fileName)
    fs.writeFileSync(filePath, buffer)

    return { success: true, path: filePath }
  } catch (error) {
    console.error("Erro ao salvar imagem:", error)
    return { success: false, error: error.message }
  }
})

// Executar script do HOTFOLDERPRINT
ipcMain.handle("execute-hotfolder-script", async () => {
  try {
    const scriptPath = "C:\\Users\\askel\\Downloads\\MoverFotos_HotFolder.bat"

    return new Promise((resolve) => {
      exec(`"${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("Erro ao executar script:", error)
          resolve({ success: false, error: error.message })
        } else {
          console.log("Script executado com sucesso:", stdout)
          resolve({ success: true, output: stdout })
        }
      })
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Verificar se pasta do HOTFOLDERPRINT existe
ipcMain.handle("check-hotfolder-path", async () => {
  const hotFolderPath = "C:\\DNP\\HotFolderPrint\\Prints\\s2x6\\DS620"
  return fs.existsSync(hotFolderPath)
})

// Abrir pasta no explorador
ipcMain.handle("open-folder", async (event, folderPath) => {
  try {
    shell.openPath(folderPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Salvar configurações
ipcMain.handle("save-config", async (event, config) => {
  try {
    const configPath = path.join(app.getPath("userData"), "config.json")
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Carregar configurações
ipcMain.handle("load-config", async () => {
  try {
    const configPath = path.join(app.getPath("userData"), "config.json")
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
      return { success: true, config }
    }
    return { success: true, config: {} }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
