/**
 * My canvas plaything, my answer to the question I set myself: how easy is it
 * to run a blur filter on image data using the HTML 5 canvas element and
 * Javascript?
 */

/**
 * Light layer on top of a canvas element that allows you to use it as an
 * image, and then manipulate the image. Pass in a canvas element and an Image
 * object and you'll see the image within the canvas element.  Use the provided
 * methods (e.g. blur) to manipulate it.
 *
 * @constructor
 * @param {HTMLElement} element HTML canvas element.
 * @param {Image} image Image object.
 */
var CanvasImage = function (element, image) {
	this.canvasElement = element;
	this.context = this.canvasElement.getContext("2d");

	this.width = image.width;
	this.height = image.height;
	this.canvasElement.width = this.width;
	this.canvasElement.height = this.height;
	this.context.drawImage(image, 0, 0, this.width, this.height);
	this.imageData = this.context.getImageData(0, 0, this.width, this.height);
};
CanvasImage.prototype = {
	/**
	 * Redraws the image on the canvas based on the current state of the
	 * object's image data.
	 */
	redraw: function () {
		this.context.putImageData(this.imageData, 0, 0);
	},

	/**
	 * Runs a blur filter over the image.
	 *
	 * @param {int} passes Number of times the blur filter should run.
	 */
	blur: function (passes) {
		var i,
			pos,
			imageDataLength = this.imageData.data.length,
			totalOpacity,
			totalRed,
			totalGreen,
			totalBlue,
			numberOfPixels,
			p,
			surroundingPixels,
			width = this.width * 4,
			pixel,
			pixelValue;
			newImage = this.context.createImageData(this.width, this.height);
		// Loop for each blur pass.
		for (i = 0; i < passes; i += 1) {
			// Loop over each pixel in the image.
			for (pos = 0; pos < imageDataLength; pos += 4) {
				totalOpacity = 0;
				totalRed = 0;
				totalGreen = 0;
				totalBlue = 0;
				numberOfPixels = 0;
				// Find the positions in the image data of the surrounding
				// eight pixels.
				surroundingPixels = [
					pos - width - 4,  // Top left.
					pos - width,  // Top middle.
					pos - width + 4,  // Top right.
					pos - 4,  // Middle left.
					pos + 4,  // Middle right.
					pos + width - 4,  // Bottom left.
					pos + width,  // Bottom middle.
					pos + width + 4  // Bottom right.
				];
				// Check each of the surrounding pixels and add their opacity,
				// red, green, and blue values to the total.
				for (p = 0; p < surroundingPixels.length; p += 1) {
					if (surroundingPixels[p] >= 0 && surroundingPixels[p] <=
							imageDataLength - 3) {
						pixel = [
							this.imageData.data[surroundingPixels[p]],
							this.imageData.data[surroundingPixels[p] + 1],
							this.imageData.data[surroundingPixels[p] + 2],
							this.imageData.data[surroundingPixels[p] + 3]
						];
						totalOpacity += pixel[0];
						totalRed += pixel[1];
						totalGreen += pixel[2];
						totalBlue += pixel[3];
						numberOfPixels += 1;
					}
				}
				// The new opacity, red, green, and blue values for this
				// pixel will be an average of the surrounding pixels.
				pixelValue = [
					totalOpacity / numberOfPixels,
					totalRed / numberOfPixels,
					totalGreen / numberOfPixels,
					totalBlue / numberOfPixels
				];
				newImage.data[pos] = pixelValue[0];
				newImage.data[pos + 1] = pixelValue[1];
				newImage.data[pos + 2] = pixelValue[2];
				newImage.data[pos + 3] = pixelValue[3];
			}
			// Update the canvas image so it matches the new blurred image
			// ready for the next pass, if there is one.
			this.imageData = newImage;
		}
		// Redraw the image on the canvas.
		this.redraw();
	}
};


/**
 * Initialise an image on the page and blur it.
 */
window.onload = function() {
	var id = "blur",
		url = "../sunset.jpg",
		image = new Image(),
		canvasImage;
	image.onload = function () {
		canvasImage = new CanvasImage(document.getElementById(id), this);
		console.time(id);
		canvasImage.blur(4);
		console.timeEnd(id);
	};
	image.src = url;
};
