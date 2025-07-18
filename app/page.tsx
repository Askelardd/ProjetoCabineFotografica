"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Camera, Euro, Printer, FolderOpen, Download, Save } from "lucide-react"

// Declarar tipos para a API do Electron
declare global {
  interface Window {
    electronAPI?: {
      saveImageToHotFolder: (
        imageData: string,
        fileName: string,
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      executeHotFolderScript: () => Promise<{ success: boolean; output?: string; error?: string }>
      checkHotFolderPath: () => Promise<boolean>
      openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>
      saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>
      loadConfig: () => Promise<{ success: boolean; config?: any; error?: string }>
    }
  }
}

interface PhotoBoothProps {
  money: number
  setMoney: (money: number) => void
  currentPage: string
  setCurrentPage: (page: string) => void
  capturedImages: string[]
  setCapturedImages: (images: string[]) => void
}

function MainPage({ money, setMoney, setCurrentPage }: PhotoBoothProps) {
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(!!window.electronAPI)
  }, [])

  const addMoney = () => {
    setMoney(money + 1)
  }

  const startPhotoSession = () => {
    if (money >= 1) {
      setCurrentPage("camera")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Camera className="h-8 w-8" />
            Cabine Fotográfica
            {isElectron && <span className="text-sm bg-green-500 text-white px-2 py-1 rounded">Desktop</span>}
          </CardTitle>
          <CardDescription>Insira dinheiro para começar sua sessão de fotos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="bg-green-100 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-green-800">
                <Euro className="h-8 w-8" />
                {money.toFixed(2)}
              </div>
              <p className="text-green-600 mt-2">Dinheiro inserido</p>
            </div>
          </div>

          <Button onClick={addMoney} className="w-full h-16 text-lg font-semibold bg-transparent" variant="outline">
            <Coins className="mr-2 h-6 w-6" />
            Inserir 1€
          </Button>

          <Button
            onClick={startPhotoSession}
            disabled={money < 1}
            className="w-full h-16 text-lg font-semibold"
            size="lg"
          >
            <Camera className="mr-2 h-6 w-6" />
            Iniciar Sessão de Fotos
            {money < 1 && " (Mínimo 1€)"}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>• 5 fotos por sessão</p>
            <p>• Custo: 1€ por sessão</p>
            {isElectron && <p>• Impressão automática via HOTFOLDERPRINT</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CameraPage({ money, setMoney, setCurrentPage, setCapturedImages }: PhotoBoothProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureCount, setCaptureCount] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = async () => {
    setCameraError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      setStream(mediaStream)

      if (videoRef) {
        videoRef.srcObject = mediaStream
        videoRef.onloadedmetadata = () => {
          videoRef
            .play()
            .then(() => {
              setCameraReady(true)
              console.log("Câmera iniciada com sucesso!")
            })
            .catch((err) => {
              console.error("Erro ao reproduzir vídeo:", err)
              setCameraError("Erro ao iniciar reprodução de vídeo")
            })
        }
      }
    } catch (error) {
      console.error("Erro ao acessar a câmera:", error)
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões.")
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const startCountdown = () => {
    if (!cameraReady) {
      alert("Aguarde a câmera inicializar ou clique em 'Iniciar Câmera'")
      return
    }

    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval)
          startCapturing()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const captureImage = (): string => {
    if (!videoRef) return ""

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.videoWidth
    canvas.height = videoRef.videoHeight
    const ctx = canvas.getContext("2d")

    if (ctx) {
      ctx.drawImage(videoRef, 0, 0)
      return canvas.toDataURL("image/jpeg", 0.8)
    }
    return ""
  }

  const startCapturing = () => {
    setIsCapturing(true)
    setCaptureCount(0)
    const images: string[] = []

    // Capturar primeira foto imediatamente
    const firstImage = captureImage()
    if (firstImage) {
      images.push(firstImage)
      setCaptureCount(1)
    }

    // Se só precisamos de 1 foto, terminar aqui
    if (images.length >= 5) {
      setCapturedImages(images)
      setMoney(money - 1)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setTimeout(() => {
        setCurrentPage("gallery")
      }, 500)
      return
    }

    // Capturar as fotos restantes com intervalo
    const captureInterval = setInterval(() => {
      const imageData = captureImage()
      if (imageData) {
        images.push(imageData)
        setCaptureCount(images.length)

        // Verificar se capturamos todas as 5 fotos
        if (images.length >= 5) {
          clearInterval(captureInterval)
          setCapturedImages(images)
          setMoney(money - 1)

          // Parar a câmera
          if (stream) {
            stream.getTracks().forEach((track) => track.stop())
          }

          setTimeout(() => {
            setCurrentPage("gallery")
          }, 500)
        }
      }
    }, 2000) // 2 segundos entre cada foto
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Sessão de Fotos</h2>
            <div className="text-green-600 font-semibold">Saldo: €{money.toFixed(2)}</div>
          </div>
        </div>

        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <video ref={setVideoRef} autoPlay playsInline muted className="w-full h-96 object-cover" />

          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                <p>Aguardando acesso à câmera...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-center p-4">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <p className="mb-4">{cameraError}</p>
                <Button onClick={startCamera} variant="destructive">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-8xl font-bold animate-pulse">{countdown}</div>
            </div>
          )}

          {isCapturing && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg">
              Capturando foto {captureCount}/5
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {!cameraReady && !isCapturing && (
            <Button onClick={startCamera} className="w-full h-16 text-lg font-semibold" size="lg">
              <Camera className="mr-2 h-6 w-6" />
              Iniciar Câmera
            </Button>
          )}

          {cameraReady && !countdown && !isCapturing && (
            <Button onClick={startCountdown} className="w-full h-16 text-lg font-semibold" size="lg">
              <Camera className="mr-2 h-6 w-6" />
              Começar Fotos (3 segundos)
            </Button>
          )}

          <Button
            onClick={() => {
              if (stream) {
                stream.getTracks().forEach((track) => track.stop())
              }
              setCurrentPage("main")
            }}
            variant="outline"
            className="w-full"
          >
            Voltar ao Menu Principal
          </Button>
        </div>
      </div>
    </div>
  )
}

function GalleryPage({ setCurrentPage, capturedImages, setCapturedImages }: PhotoBoothProps) {
  const [isElectron, setIsElectron] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingPhoto, setProcessingPhoto] = useState<number | null>(null)

  useEffect(() => {
    setIsElectron(!!window.electronAPI)
  }, [])

  const saveImage = (imageData: string, index: number) => {
    if (!window.electronAPI) {
      // Fallback para versão web - baixar a foto
      const link = document.createElement("a")
      link.download = `foto-${index + 1}.jpg`
      link.href = imageData
      link.click()
      return
    }

    // Versão Electron - salvar na pasta
    saveSinglePhotoToFolder(imageData, index)
  }

  const saveSinglePhotoToFolder = async (imageData: string, index: number) => {
    setProcessingPhoto(index)

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const fileName = `DS620_2x6_${timestamp}_foto${index + 1}.jpg`

      const result = await window.electronAPI!.saveImageToHotFolder(imageData, fileName)

      if (result.success) {
        alert(`✅ Foto ${index + 1} salva na pasta!\n\nSalva em: ${result.path}`)
      } else {
        alert(`❌ Erro ao salvar foto ${index + 1}:\n${result.error}`)
      }
    } catch (error) {
      console.error("Erro ao salvar foto:", error)
      alert(`❌ Erro ao salvar foto ${index + 1}. Verifique se a pasta do HOTFOLDERPRINT existe.`)
    } finally {
      setProcessingPhoto(null)
    }
  }

  const saveAllPhotosToFolder = async () => {
    if (!window.electronAPI) {
      // Fallback para versão web - baixar todas
      capturedImages.forEach((imageData, index) => {
        setTimeout(() => {
          const link = document.createElement("a")
          link.download = `foto-${index + 1}.jpg`
          link.href = imageData
          link.click()
        }, index * 200)
      })
      return
    }

    setIsProcessing(true)
    let successCount = 0

    try {
      for (let i = 0; i < capturedImages.length; i++) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
        const fileName = `DS620_2x6_${timestamp}_foto${i + 1}.jpg`

        const result = await window.electronAPI.saveImageToHotFolder(capturedImages[i], fileName)

        if (result.success) {
          successCount++
          console.log(`Foto ${i + 1} salva em: ${result.path}`)
        } else {
          console.error(`Erro ao salvar foto ${i + 1}:`, result.error)
        }

        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      alert(
        `✅ ${successCount} fotos salvas na pasta!\n\nAs fotos foram salvas em:\nC:\\DNP\\HotFolderPrint\\Prints\\s2x6\\DS620`,
      )
    } catch (error) {
      console.error("Erro ao salvar fotos:", error)
      alert("❌ Erro ao salvar fotos. Verifique se a pasta do HOTFOLDERPRINT existe.")
    } finally {
      setIsProcessing(false)
    }
  }

  const printPhotosFromFolder = async () => {
    if (!window.electronAPI) {
      const instructions = `🚀 IMPRIMIR FOTOS DA PASTA:

1. Pressione Windows + R
2. Digite: cmd
3. Pressione Enter
4. No prompt, digite:
   cd C:\\Users\\askel\\Downloads
5. Digite: MoverFotos_HotFolder.bat
6. Pressione Enter`

      alert(instructions)
      return
    }

    try {
      const result = await window.electronAPI.executeHotFolderScript()

      if (result.success) {
        alert("✅ Comando de impressão executado!\nAs fotos da pasta foram enviadas para impressão.")
      } else {
        alert(`❌ Erro ao executar comando de impressão:\n${result.error}`)
      }
    } catch (error) {
      alert("❌ Erro ao executar comando de impressão. Verifique se o script existe.")
    }
  }

  const openHotFolderDirectory = async () => {
    if (!window.electronAPI) {
      alert("Funcionalidade disponível apenas na versão desktop!")
      return
    }

    try {
      await window.electronAPI.openFolder("C:\\DNP\\HotFolderPrint\\Prints\\s2x6\\DS620")
    } catch (error) {
      alert("Erro ao abrir pasta. Verifique se o caminho existe.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Suas Fotos Estão Prontas!</CardTitle>
            <CardDescription>
              Aqui estão as {capturedImages.length} fotos da sua sessão
              {isElectron && " - Versão Desktop com impressão automática"}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {capturedImages.map((imageData, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={imageData || "/placeholder.svg"}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <Button
                    onClick={() => saveImage(imageData, index)}
                    className="w-full"
                    variant="outline"
                    disabled={processingPhoto === index}
                  >
                    {isElectron ? (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {processingPhoto === index ? "Salvando..." : `Salvar Foto ${index + 1}`}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Foto {index + 1}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* BOTÕES PRINCIPAIS REORGANIZADOS */}
        <div className="flex gap-4 justify-center flex-wrap mb-4">
          <Button onClick={printPhotosFromFolder} className="px-8 py-4 text-lg bg-red-600 hover:bg-red-700" size="lg">
            <Printer className="mr-2 h-6 w-6" />
            Imprimir Fotos da Pasta
          </Button>

          <Button
            onClick={saveAllPhotosToFolder}
            disabled={isProcessing}
            className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Save className="mr-2 h-6 w-6" />
            {isProcessing ? "Salvando..." : "Salvar Todas na Pasta"}
          </Button>

          <Button
            onClick={() => {
              setCapturedImages([])
              setCurrentPage("main")
            }}
            variant="outline"
            className="px-8 py-4 text-lg"
            size="lg"
          >
            <Camera className="mr-2 h-6 w-6" />
            Nova Sessão
          </Button>
        </div>

        {/* BOTÃO SECUNDÁRIO */}
        {isElectron && (
          <div className="flex justify-center">
            <Button onClick={openHotFolderDirectory} variant="ghost" className="px-6 py-2 text-sm">
              <FolderOpen className="mr-2 h-4 w-4" />
              Abrir Pasta HOTFOLDERPRINT
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PhotoBooth() {
  const [money, setMoney] = useState(0)
  const [currentPage, setCurrentPage] = useState("main")
  const [capturedImages, setCapturedImages] = useState<string[]>([])

  const props = {
    money,
    setMoney,
    currentPage,
    setCurrentPage,
    capturedImages,
    setCapturedImages,
  }

  switch (currentPage) {
    case "camera":
      return <CameraPage {...props} />
    case "gallery":
      return <GalleryPage {...props} />
    default:
      return <MainPage {...props} />
  }
}
// melhoria a fazer, quando sair para o menu apagar as imagens capturadas