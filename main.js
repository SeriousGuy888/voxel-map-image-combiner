const { createCanvas, loadImage, screenshotCanvas} = require("puppet-canvas")
const path = require("path")
const fs = require("fs")
const imageDataURI = require("image-data-uri")

let targetFolder = null
if(process.argv[2]) {
  targetFolder = process.argv[2]
  console.log(`Target folder = ${targetFolder}`)
}
else {
  console.error(`please provide the path to your voxelmap image output folder (..\\z1)`)
}
const regionSize = 256

function difference(valA, valB) {
  return Math.max(valA, valB) - Math.min(valA, valB)
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
  for(let fileName of files) {
    //Get path to file
    let filePath = path.join(targetFolder, fileName)
    //Load image
    let imageData = await imageDataURI.encodeFromFile(filePath)
    let image = await loadImage(imageData, canvas)
    //Find region coordinates from the filename
    let regionCoords = fileName.split(",")
    let x = parseInt(regionCoords[0])
    let y = parseInt(regionCoords[1])
    //Draw image to canvas
    let pixX = (baseX + x) * regionSize
    let pixY = (baseY + y) * regionSize
    ctx.drawImage(image, pixX, pixY, regionSize, regionSize)
    console.log("drew", fileName)
  }

  //Save PNG file
  const completeImage = await screenshotCanvas(canvas)
  fs.writeFile(path.join("./", "out.png"), completeImage, "base64", e => {
    if(err)
      console.log(err)
    console.log("done")
  })
})