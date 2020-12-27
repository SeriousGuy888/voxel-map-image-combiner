const { createCanvas, loadImage, screenshotCanvas } = require("puppet-canvas")
const path = require("path")
const fs = require("fs")
const imageDataURI = require("image-data-uri")

let targetFolder

const args = process.argv.slice(2) // in ["node", "main.js", "<path>", "<other>"], return ["<path>", "<other>"]
if(args[0]) {
  targetFolder = args[0]
  console.log(`Target folder = ${targetFolder}`)
}
else
  console.error("Syntax: `node main.js <path>` (..\\z1)")

let originFill = args[1] // fill colour of 0,0 coordinate on map
let originRadius = parseInt(args[2]) || 10 // how large to make the circle at 0,0

let originPixelLocation = []

if(originFill && !originFill.startsWith("#")) {
  console.error("Origin fill parameter must begin with `#`. (e.g: `#ffff0080`)")
  process.exit()
}


const outputDir = "./output"
if(!fs.existsSync(outputDir)) { // if output folder does not exist
  fs.mkdirSync(outputDir) // create output folder
}


const regionSize = 256

const difference = (a, b) => Math.max(a, b) - Math.min(a, b)
const currentTimeString = () => {
  const date = new Date()
  return date.toISOString()
    .replace(/:/g, "-")
    .replace(/T/g, "_")
}

fs.readdir(targetFolder, async(err, files) => {
  if(err)
    console.log(`Error: ${err}`)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for(let fileName of files) {
    //Determine min and max (edge) region coordinates
    let regionCoords = fileName.split(",")
    let x = parseInt(regionCoords[0])
    let y = parseInt(regionCoords[1])
    if(x > maxX)
      maxX = x
    if(x < minX)
      minX = x
    if(y > maxY)
      maxY = y
    if(y < minY)
      minY = y
  }

  console.log(`Located edge regions, FirstX = ${minX}, LastX = ${maxX}, FirstY = ${minY} LastY = ${maxY}`)
  let baseX = minX * -1
  let baseY = minY * -1
  let width = (difference(minX, maxX) + 1) * regionSize
  let height = (difference(minY, maxY) + 1) * regionSize
  console.log(`Creating canvas with width = ${width}, height = ${height}`)
  let canvas = await createCanvas(width, height)
  let ctx = await canvas.getContext("2d")
  ctx.fillRect(0, 0, width, height) // black background
  //Loop through each image file, load it, and draw it to the canvas
  for(const i in files) {
    //Get path to file
    let filePath = path.join(targetFolder, files[i])
    //Load image
    let imageData = await imageDataURI.encodeFromFile(filePath)
    let image = await loadImage(imageData, canvas)
    //Find region coordinates from the filename
    let regionCoords = files[i].split(",")
    let x = parseInt(regionCoords[0])
    let y = parseInt(regionCoords[1])
    //Draw image to canvas
    let pixX = (baseX + x) * regionSize
    let pixY = (baseY + y) * regionSize

    ctx.drawImage(image, pixX, pixY, regionSize, regionSize)
    if(files[i] === "0,0.png") {
      originPixelLocation = [pixX, pixY]
      if(originFill) { // if a marker at 0,0 is needed and file is 0,0
        ctx.fillStyle = originFill
  
        ctx.beginPath()
        ctx.arc(pixX, pixY, originRadius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
      }
    }
    console.log(`Drew ${files[i]} (${parseInt(i) + 1}/${files.length})`)
  }

  //Save PNG file
  const completeImage = await screenshotCanvas(canvas)
  const outputFilePath = path.join(`${outputDir}/`, `${currentTimeString()}.png`)
  fs.writeFile(outputFilePath, completeImage, "base64", e => {
    if(e)
      console.log(e)
    
    console.log("\nMap complete.\n=====")
    console.log(`Output file: ${path.join(__dirname, outputFilePath)}`)
    console.log(`The dimensions of the compiled map are W: ${width} H: ${height}.`)
    console.log(`The coordinates 0,0 are ${originPixelLocation ? "at pixel " + originPixelLocation.join(",") : "not in the map"}.`)
    process.exit()
  })
})