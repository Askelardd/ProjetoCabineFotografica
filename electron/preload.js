const { contextBridge, ipcRenderer } = require("electron")

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Salvar imagem diretamente no HOTFOLDERPRINT
  saveImageToHotFolder: (imageData, fileName) => ipcRenderer.invoke("save-image-to-hotfolder", imageData, fileName),

  // Executar script
  executeHotFolderScript: () => ipcRenderer.invoke("execute-hotfolder-script"),

  // Verificar se pasta existe
  checkHotFolderPath: () => ipcRenderer.invoke("check-hotfolder-path"),

  // Abrir pasta
  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),

  // Configurações
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),

  loadConfig: () => ipcRenderer.invoke("load-config"),
})
