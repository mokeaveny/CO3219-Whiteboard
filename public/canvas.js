"use strict";

(function () {
  var socket = io();
  // This object holds the implementation of each drawing tool.
  var tools = {};
  var textarea;
  var colorPicked;
  var lineWidthPicked;
  var SelectedFontFamily;
  var SelectedFontSize;

  // Keep everything in anonymous function, called on window load.
  if (window.addEventListener) {
    window.addEventListener(
      "load",
      function () {
        var canvas, context, canvaso, contexto;

        // The active tool instance.
        var tool;
        var tool_default = "pencil";

        function init() {
          // Find the canvas element.
          canvaso = document.getElementById("imageView");
          if (!canvaso) {
            alert("Error: I cannot find the canvas element!");
            return;
          }

          if (!canvaso.getContext) {
            alert("Error: no canvas.getContext!");
            return;
          }

          // Get the 2D canvas context.
          contexto = canvaso.getContext("2d");
          if (!contexto) {
            alert("Error: failed to getContext!");
            return;
          }

          // Add the temporary canvas.
          var container = canvaso.parentNode;
          canvas = document.createElement("canvas");
          if (!canvas) {
            alert("Error: I cannot create a new canvas element!");
            return;
          }

          canvas.id = "imageTemp";
          canvas.width = canvaso.width;
          canvas.height = canvaso.height;
          container.appendChild(canvas);

          context = canvas.getContext("2d");

          var tool_select = document.getElementById("pencil-button");

          // Activate the default tool.
          if (tools[tool_default]) {
            tool = new tools[tool_default]();
            tool_select.value = tool_default;
          }

          function pic_tool_click(pick) {
            if (tools[pick.value]) {
              tool = new tools[pick.value]();
            }
          }

          $("#pencil-button").click(function () {
            pic_tool_click(this);
          });

          $("#rect-button").click(function () {
            pic_tool_click(this);
          });

          $("#circle-button").click(function () {
            pic_tool_click(this);
          });

          $("#ellipse-button").click(function () {
            pic_tool_click(this);
          });

          $("#line-button").click(function () {
            pic_tool_click(this);
          });

          $("#text-button").click(function () {
            pic_tool_click(this);
          });

          function SketchGrid(gridSize) {
            context.clearRect(0, 0, canvas.width, canvas.height);

            var w = canvas.width;
            var h = canvas.height;
            var gridWidth, gridColor;

            if (gridSize == "normal") {
              gridWidth = 25;
              gridColor = "#e7e8e8";
            } else if (gridSize == "medium") {
              gridWidth = 45;
              gridColor = "#e7e8e8";
            } else if (gridSize == "large") {
              gridWidth = 65;
              gridColor = "#e7e8e8";
            } else if (gridSize == "nogrid") {
              gridWidth = 25;
              gridColor = "#fff"; //no grid
            }

            context.beginPath(); //important draw new everytime

            for (var i = 0.5; i < w || i < h; i += gridWidth) {
              // draw horizontal lines
              context.moveTo(i, 0);
              context.lineTo(i, h);
              // draw vertical lines
              context.moveTo(0, i);
              context.lineTo(w, i);
            }
            context.strokeStyle = gridColor;
            context.stroke();
          }

          function throttle(callback, delay) {
            var previousCall = new Date().getTime();
            return function () {
              var time = new Date().getTime();

              if (time - previousCall >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
              }
            };
          }

          // Attach the mousedown, mousemove and mouseup event listeners.
          canvas.addEventListener("mousedown", ev_canvas, false);
          canvas.addEventListener("mousemove", throttle(ev_canvas, 10), false);
          canvas.addEventListener("mouseup", ev_canvas, false);
        }

        // The general-purpose event handler. This function just determines the mouse
        // position relative to the canvas element.
        function ev_canvas(ev) {
          var CanvPos = canvas.getBoundingClientRect(); //Global Fix cursor position bug
          if (ev.clientX || ev.clientX == 0) {
            // Firefox
            ev._x = ev.clientX - CanvPos.left;
            ev._y = ev.clientY - CanvPos.top;
          } else if (ev.offsetX || ev.offsetX == 0) {
            // Opera
          }

          // Call the event handler of the tool.
          var func = tool[ev.type];
          if (func) {
            func(ev);
          }
        }

        // This function draws the #imageTemp canvas on top of #imageView, after which
        // #imageTemp is cleared. This function is called each time when the user
        // completes a drawing operation.
        function img_update(trans) {
          contexto.drawImage(canvas, 0, 0);
          context.clearRect(0, 0, canvas.width, canvas.height);
          console.log(tool);
          if (!trans) {
            return;
          }

          socket.emit("copyCanvas", {
            transferCanvas: true,
          });
        }

        function onCanvasTransfer(data) {
          img_update();
        }

        socket.on("copyCanvas", onCanvasTransfer);

        // Set the area
        textarea = document.createElement("textarea");

        // Pencil
        function drawPencil(x0, y0, x1, y1, color, linewidth, emit) {
          context.beginPath();
          context.moveTo(x0, y0);
          context.lineTo(x1, y1);
          if (color) context.strokeStyle = "#" + color;
          else context.strokeStyle = "#" + colorPicked;
          if (linewidth) context.lineWidth = linewidth;
          else context.lineWidth = lineWidthPicked;
          context.stroke();
          context.closePath();

          if (!emit) {
            return;
          }
          var w = canvaso.width;
          var h = canvaso.height;

          socket.emit("drawing", {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: colorPicked,
            lineThickness: lineWidthPicked,
          });
        }

        function onDrawingEvent(data) {
          var w = canvaso.width;
          var h = canvaso.height;
          drawPencil(
            data.x0 * w,
            data.y0 * h,
            data.x1 * w,
            data.y1 * h,
            data.color,
            data.lineThickness
          );
        }

        socket.on("drawing", onDrawingEvent);

        // Pencil tool
        tools.pencil = function () {
          var tool = this;
          this.started = false;
          textarea.style.display = "none";
          textarea.style.value = "";

          // This is called when you start holding down the mouse button.
          // This starts the pencil drawing.
          this.mousedown = function (ev) {
            tool.started = true;
            tool.x0 = ev._x;
            tool.y0 = ev._y;
          };

          // This function is called every time you move the mouse. Obviously, it only
          // draws if the tool.started state is set to true (when you are holding down
          // the mouse button).
          this.mousemove = function (ev) {
            if (tool.started) {
              drawPencil(
                tool.x0,
                tool.y0,
                ev._x,
                ev._y,
                colorPicked,
                lineWidthPicked,
                true
              );
              tool.x0 = ev._x;
              tool.y0 = ev._y;
            }
          };

          // This is called when you release the mouse button.
          this.mouseup = function (ev) {
            if (tool.started) {
              tool.mousemove(ev);
              tool.started = false;
              img_update(true);
            }
          };
        };

        // Rectangle
        function drawRect(min_x, min_y, abs_x, abs_y, color, linewidth, emit) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          if (color) context.strokeStyle = "#" + color;
          else context.strokeStyle = "#" + colorPicked;
          if (linewidth) context.lineWidth = linewidth;
          else context.lineWidth = lineWidthPicked;
          context.strokeRect(min_x, min_y, abs_x, abs_y);

          if (!emit) {
            return;
          }
          var w = canvaso.width;
          var h = canvaso.height;

          socket.emit("rectangle", {
            min_x: min_x / w,
            min_y: min_y / h,
            abs_x: abs_x / w,
            abs_y: abs_y / h,
            color: colorPicked,
            lineThickness: lineWidthPicked,
          });
        }

        function onDrawRect(data) {
          var w = canvaso.width;
          var h = canvaso.height;
          console.log("IN");
          drawRect(
            data.min_x * w,
            data.min_y * h,
            data.abs_x * w,
            data.abs_y * h,
            data.color,
            data.lineThickness
          );
        }

        socket.on("rectangle", onDrawRect);

        // Rectangle tool
        tools.rect = function () {
          var tool = this;
          this.started = false;
          textarea.style.display = "none";
          textarea.style.value = "";

          this.mousedown = function (ev) {
            tool.started = true;
            tool.x0 = ev._x;
            tool.y0 = ev._y;
          };

          this.mousemove = function (ev) {
            if (!tool.started) {
              return;
            }

            var pos_x = Math.min(ev._x, tool.x0),
              pos_y = Math.min(ev._y, tool.y0),
              pos_w = Math.abs(ev._x - tool.x0),
              pos_h = Math.abs(ev._y - tool.y0);

            context.clearRect(0, 0, canvas.width, canvas.height); //in drawRect

            if (!pos_w || !pos_h) {
              return;
            }
            drawRect(
              pos_x,
              pos_y,
              pos_w,
              pos_h,
              colorPicked,
              lineWidthPicked,
              true
            );
          };

          this.mouseup = function (ev) {
            if (tool.started) {
              tool.mousemove(ev);
              tool.started = false;
              img_update(true);
            }
          };
        };

        // Line
        function drawLines(x0, y0, x1, y1, color, linewidth, emit) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.beginPath();
          context.moveTo(x0, y0);
          context.lineTo(x1, y1);
          if (color) context.strokeStyle = "#" + color;
          else context.strokeStyle = "#" + colorPicked;
          if (linewidth) context.lineWidth = linewidth;
          else context.lineWidth = lineWidthPicked;
          context.stroke();
          context.closePath();

          if (!emit) {
            return;
          }
          var w = canvaso.width;
          var h = canvaso.height;

          socket.emit("linedraw", {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: colorPicked,
            lineThickness: lineWidthPicked,
          });
        }

        function onDrawLines(data) {
          var w = canvaso.width;
          var h = canvaso.height;
          drawLines(
            data.x0 * w,
            data.y0 * h,
            data.x1 * w,
            data.y1 * h,
            data.color,
            data.lineThickness
          );
        }

        socket.on("linedraw", onDrawLines);

        // Line tool
        tools.line = function () {
          var tool = this;
          this.started = false;
          textarea.style.display = "none";
          textarea.style.value = "";

          this.mousedown = function (ev) {
            tool.started = true;
            tool.x0 = ev._x;
            tool.y0 = ev._y;
          };

          this.mousemove = function (ev) {
            if (!tool.started) {
              return;
            }
            drawLines(
              tool.x0,
              tool.y0,
              ev._x,
              ev._y,
              colorPicked,
              lineWidthPicked,
              true
            );
          };

          this.mouseup = function (ev) {
            if (tool.started) {
              tool.mousemove(ev);
              tool.started = false;
              img_update(true);
            }
          };
        };

        // Circle
        function drawCircle(x1, y1, x2, y2, color, linewidth, emit) {
          context.clearRect(0, 0, canvas.width, canvas.height);

          var x = (x2 + x1) / 2;
          var y = (y2 + y1) / 2;

          var radius = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;

          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2, false);
          context.closePath();
          if (color) context.strokeStyle = "#" + color;
          else context.strokeStyle = "#" + colorPicked;
          if (linewidth) context.lineWidth = linewidth;
          else context.lineWidth = lineWidthPicked;
          context.stroke();

          if (!emit) {
            return;
          }
          var w = canvaso.width;
          var h = canvaso.height;

          socket.emit("circledraw", {
            x1: x1 / w,
            y1: y1 / h,
            x2: x2 / w,
            y2: y2 / h,
            color: colorPicked,
            lineThickness: lineWidthPicked,
          });
        }
        function onDrawCircle(data) {
          var w = canvaso.width;
          var h = canvaso.height;
          drawCircle(
            data.x1 * w,
            data.y1 * h,
            data.x2 * w,
            data.y2 * h,
            data.color,
            data.lineThickness
          );
        }

        socket.on("circledraw", onDrawCircle);

        // Circle tool
        tools.circle = function () {
          var tool = this;
          this.started = false;
          textarea.style.display = "none";
          textarea.style.value = "";

          this.mousedown = function (ev) {
            tool.started = true;
            var rect = canvas.getBoundingClientRect();
            tool.x1 = ev.clientX - rect.left;
            tool.y1 = ev.clientY - rect.top;
          };

          this.mousemove = function (ev) {
            if (!tool.started) {
              return;
            }

            var rect = canvas.getBoundingClientRect();
            tool.x2 = ev.clientX - rect.left;
            tool.y2 = ev.clientY - rect.top;

            context.clearRect(0, 0, canvas.width, canvas.height);
            drawCircle(
              tool.x1,
              tool.y1,
              tool.x2,
              tool.y2,
              colorPicked,
              lineWidthPicked,
              true
            );
          };

          this.mouseup = function (ev) {
            if (tool.started) {
              tool.mousemove(ev);
              tool.started = false;
              img_update(true);
            }
          };
        };

        // Ellipse
        function drawEllipse(x, y, w, h, color, linewidth, emit) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          var ox, oy, xe, ye, xm, ym;
          var kappa = 0.5522848;
          (ox = (w / 2) * kappa), // control point offset horizontal
            (oy = (h / 2) * kappa), // control point offset vertical
            (xe = x + w), // x-end
            (ye = y + h), // y-end
            (xm = x + w / 2), // x-middle
            (ym = y + h / 2); // y-middle

          context.beginPath();
          context.moveTo(x, ym);
          context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
          context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
          context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
          context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
          context.closePath();

          if (color) context.strokeStyle = "#" + color;
          else context.strokeStyle = "#" + colorPicked;
          if (linewidth) context.lineWidth = linewidth;
          else context.lineWidth = lineWidthPicked;
          context.stroke();

          if (!emit) {
            return;
          }
          var canv_w = canvaso.width;
          var canv_h = canvaso.height;

          socket.emit("ellipsedraw", {
            x: x,
            y: y,
            w: w,
            h: h,
            color: colorPicked,
            lineThickness: lineWidthPicked,
          });
        }

        function onDrawEllipse(data) {
          var w = canvaso.width;
          var h = canvaso.height;
          drawEllipse(
            data.x,
            data.y,
            data.w,
            data.h,
            data.color,
            data.lineThickness
          );
        }

        socket.on("ellipsedraw", onDrawEllipse);

        // Ellipse tool
        tools.ellipse = function () {
          var tool = this;
          this.started = false;
          textarea.style.display = "none";
          textarea.style.value = "";

          this.mousedown = function (ev) {
            tool.started = true;
            tool.x0 = ev._x;
            tool.y0 = ev._y;
          };

          this.mousemove = function (ev) {
            if (!tool.started) {
              return;
            }

            var x = Math.min(ev._x, tool.x0);
            var y = Math.min(ev._y, tool.y0);

            var w = Math.abs(ev._x - tool.x0);
            var h = Math.abs(ev._y - tool.y0);

            context.clearRect(0, 0, canvas.width, canvas.height);
            drawEllipse(x, y, w, h, colorPicked, lineWidthPicked, true);
          };

          this.mouseup = function (ev) {
            if (tool.started) {
              tool.mousemove(ev);
              tool.started = false;
              img_update(true);
            }
          };
        };

        // Clear the canvas
        function clearAll_update(trans) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          contexto.clearRect(0, 0, canvaso.width, canvaso.height);

          if (!trans) {
            return;
          }

          socket.emit("Clearboard", {
            CleardrawingBoard: true,
          });
        }

        function onClearAll(data) {
          clearAll_update();
        }

        socket.on("Clearboard", onClearAll);

        $("#clear-all").click(function () {
          context.clearRect(0, 0, canvas.width, canvas.height);
          contexto.clearRect(0, 0, canvaso.width, canvaso.height);
          clearAll_update(true);
        });

        init();
      },
      false
    );
  }
})();
