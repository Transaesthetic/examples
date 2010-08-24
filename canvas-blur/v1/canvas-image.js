/**
 * My canvas plaything, my answer to the question I set myself: how easy is it
 * to manipulate image data using the HTML 5 canvas element?
 */


/**
 * Error thrown when a coordinate that doesn't exist is passed to the
 * CanvasImageData.convertCoordsToIndex(x, y) function.
 */
var CoordinateError = {};


/**
 * When you get image data from a canvas element's 2D context you're left with
 * a one-dimensional array contanining four items for every pixel in the image
 * (opacity, and red, green, and blue values). This means it's very fast to
 * access the data but that your head will hurt when trying to work out what
 * pixel is where.
 *
 * CanvasImageData makes it much easier for you to work with image data. It
 * provides methods to get and set individual pixel data, and to convert x and
 * y coordinates to the correct index.
 *
 * @constructor
 * @param imageData The base image data.
 */
var CanvasImageData = function (imageData) {
	this.width = imageData.width;
	this.height = imageData.height;
	this.data = imageData.data;
	this.imageData = imageData;
};
CanvasImageData.prototype = {
	/**
	 * Convert a pair of x and y coordinates to the index of the first of the
	 * four elements for that particular pixel in the image data. For example,
	 * if you have a 100x100 image and you pass in x=34, y=56, the function
	 * will return 22536, the position of the opacity value for the pixel at
	 * position (34, 56).  The red, green, and blue values will be the
	 * following three elements in the array.
	 *
	 * @param {int} x The horizontal position of the pixel.
	 * @param {int} y The vertical position of the pixel.
	 * @throws CoordinateError The x or y coordinate is out of range.
	 * @return Index of the pixel's first element within the image data array.
	 * @type int
	 */
	convertCoordsToIndex: function (x, y) {
		if (x < 0 || x > this.width || y < 0 || y > this.height) {
			throw CoordinateError;
		}
		return (y * this.width * 4) + (x * 4);
	},

	/**
	 * Returns a four-element array containing the opacity, red, green, and
	 * blue values for the pixel at the given x, y position.
	 *
	 * @param {int} x The horizontal position of the pixel.
	 * @param {int} y The vertical position of the pixel.
	 * @return Array of opacity, red, green, and blue values for the pixel.
	 * @type Array
	 */
	getPixel: function (x, y) {
		var pos;
		try {
			pos = this.convertCoordsToIndex(x, y);
			return [
				this.imageData.data[pos],
				this.imageData.data[pos + 1],
				this.imageData.data[pos + 2],
				this.imageData.data[pos + 3]
			];
		}
		catch (e) {
			return false;
		}
	},

	/**
	 * Sets the opacity, red, green, and blue values for the pixel at the given
	 * x, y position.
	 *
	 * @param {int} x The horizontal position of the pixel.
	 * @param {int} y The vertical position of the pixel.
	 * @param {Array} pixelValues Opacity, red, green, and blue values.
	 */
	setPixel: function (x, y, pixelValues) {
		var pos;
		try {
			pos = this.convertCoordsToIndex(x, y);
		}
		catch (e) {
			return false;
		}
		this.imageData.data[pos] = pixelValues[0];
		this.imageData.data[pos + 1] = pixelValues[1];
		this.imageData.data[pos + 2] = pixelValues[2];
		this.imageData.data[pos + 3] = pixelValues[3];
	}
};


/**
 * Light layer on top of a canvas element that allows you to use it as an
 * image, and then manipulate the image. Pass in a canvas element and an Image
 * object and you'll see the image within the canvas element.  Use the provided
 * methods (e.g. flipHorizontal) to manipulate it,
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
	this.canvasImageData = new CanvasImageData(this.context.getImageData(0, 0,
		this.width, this.height));
};
CanvasImage.prototype = {
	/**
	 * Redraws the image on the canvas based on the current state of the
	 * object's CanvasImageData.
	 */
	redraw: function () {
		this.context.putImageData(this.canvasImageData.imageData, 0, 0);
	},

	/**
	 * Losslessly flips the image horizontally.  This can be done on a canvas
	 * using native methods but it's more fun to write it yourself.
	 */
	flipHorizontal: function () {
		var newData = this.context.createImageData(this.width, this.height),
			newImage = new CanvasImageData(newData),
			pixel,
			pos,
			x,
			y;

		for (y = 0; y < this.height; y += 1) {
			for (x = 0; x < this.width; x += 1) {
				pos = -(x - this.width) - 1;
				pixel = this.canvasImageData.getPixel(x, y);
				if (pixel) {
					newImage.setPixel(pos, y, pixel);
				}
			}
		}
		this.canvasImageData = newImage;
		this.redraw();
	},

	/**
	 * Runs a blur filter over the image.
	 *
	 * @param {int} passes Number of times the blur filter should run.
	 */
	blur: function (passes) {
		var i,
			y,
			x,
			p,
			newData = this.context.createImageData(this.width, this.height),
			newImage = new CanvasImageData(newData),
			surroundingPixels,
			surroundingPixelsLength = 8,
			pixel,
			totalOpacity,
			totalRed,
			totalGreen,
			totalBlue,
			numberOfPixels,
			pixelValue;
		// Loop for each pass.
		for (i = 0; i < passes; i += 1) {
			// Loop over each row of pixels.
			for (y = 0; y < this.height; y += 1) {
				// Loop over each column of pixels.
				for (x = 0; x < this.width; x += 1) {
					totalOpacity = 0;
					totalRed = 0;
					totalGreen = 0;
					totalBlue = 0;
					numberOfPixels = 0;
					surroundingPixels = [
						[x - 1, y - 1],  // Top left.
						[x, y - 1],  // Top middle.
						[x + 1, y - 1],  // Top right.
						[x - 1, y],  // Middle left.
						[x * 1, y],  // Middle right.
						[x - 1, y + 1],  // Bottom left.
						[x, y + 1],  // Bottom middle.
						[x + 1, y + 1]  // Bottom right.
					];
					// Get each of the surrounding pixels and add their
					// opacity, red, green, and blue values to the total.
					for (p = 0; p < surroundingPixelsLength; p += 1) {
						pixel = this.canvasImageData.getPixel(
							surroundingPixels[p][0], surroundingPixels[p][1]);
						if (pixel) {
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
					newImage.setPixel(x, y, pixelValue);
				}
			}
			// Update the canvas image so it matches the new blurred image
			// ready for the next pass, if there is on.
			this.canvasImageData = newImage;
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
