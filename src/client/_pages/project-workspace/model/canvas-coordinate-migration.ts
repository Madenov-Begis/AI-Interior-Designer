import type { Canvas } from "fabric";
import type { VisualPromptCanvasState } from "@/features/visual-prompt";

export function migrateCanvasCoordinates(
  canvas: Canvas,
  initialState: VisualPromptCanvasState,
  editorWidth: number,
  editorHeight: number,
  { FabricImage, util }: Pick<typeof import("fabric"), "FabricImage" | "util">,
) {
  const savedWidth = initialState.coordinateSpace.editorWidth;
  const savedHeight = initialState.coordinateSpace.editorHeight;
  const scaleX = editorWidth / savedWidth;
  const scaleY = editorHeight / savedHeight;

  if (
    Number.isFinite(scaleX) &&
    Number.isFinite(scaleY) &&
    scaleX > 0 &&
    scaleY > 0 &&
    (scaleX !== 1 || scaleY !== 1)
  ) {
    const activeCanvas = canvas;
    const renderOnAddRemove = activeCanvas.renderOnAddRemove;
    activeCanvas.renderOnAddRemove = false;
    try {
      activeCanvas.getObjects().forEach((object, index) => {
        let migratedObject = object;
        if (object.strokeUniform) {
          // Bake the legacy canvas-space appearance before applying
          // the outer coordinate transform. Alpha-trimming the
          // padded render avoids Fabric's fractional bbox clipping
          // without changing the pixels or averaging stroke scale.
          const oldCenter = object.getRelativeCenterPoint();
          const baseRaster = object.toCanvasElement({
            enableRetinaScaling: false,
          });
          const padding = Math.ceil(
            object.strokeWidth * Math.max(1, object.strokeMiterLimit) + 2,
          );
          const paddedRaster = object.toCanvasElement({
            enableRetinaScaling: false,
            left: -padding,
            top: -padding,
            width: baseRaster.width + padding * 2,
            height: baseRaster.height + padding * 2,
          });
          const context = paddedRaster.getContext("2d", {
            willReadFrequently: true,
          });
          let cropLeft = 0;
          let cropTop = 0;
          let cropRight = paddedRaster.width - 1;
          let cropBottom = paddedRaster.height - 1;

          if (context) {
            const pixels = context.getImageData(
              0,
              0,
              paddedRaster.width,
              paddedRaster.height,
            ).data;
            let alphaLeft = paddedRaster.width;
            let alphaTop = paddedRaster.height;
            let alphaRight = -1;
            let alphaBottom = -1;
            for (let y = 0; y < paddedRaster.height; y += 1) {
              for (let x = 0; x < paddedRaster.width; x += 1) {
                if (pixels[(y * paddedRaster.width + x) * 4 + 3] === 0) {
                  continue;
                }
                alphaLeft = Math.min(alphaLeft, x);
                alphaTop = Math.min(alphaTop, y);
                alphaRight = Math.max(alphaRight, x);
                alphaBottom = Math.max(alphaBottom, y);
              }
            }
            if (alphaRight >= alphaLeft && alphaBottom >= alphaTop) {
              cropLeft = Math.max(0, alphaLeft - 1);
              cropTop = Math.max(0, alphaTop - 1);
              cropRight = Math.min(paddedRaster.width - 1, alphaRight + 1);
              cropBottom = Math.min(paddedRaster.height - 1, alphaBottom + 1);
            }
          }

          const cropWidth = cropRight - cropLeft + 1;
          const cropHeight = cropBottom - cropTop + 1;
          const raster = paddedRaster.ownerDocument.createElement("canvas");
          raster.width = cropWidth;
          raster.height = cropHeight;
          raster
            .getContext("2d")
            ?.drawImage(
              paddedRaster,
              cropLeft,
              cropTop,
              cropWidth,
              cropHeight,
              0,
              0,
              cropWidth,
              cropHeight,
            );
          const paddedCenterX = baseRaster.width / 2 + padding;
          const paddedCenterY = baseRaster.height / 2 + padding;
          const bakedImage = new FabricImage(raster, {
            left: oldCenter.x + cropLeft + cropWidth / 2 - paddedCenterX,
            top: oldCenter.y + cropTop + cropHeight / 2 - paddedCenterY,
            originX: "center",
            originY: "center",
            selectable: object.selectable,
            evented: object.evented,
            visible: object.visible,
          });
          activeCanvas.remove(object);
          activeCanvas.insertAt(index, bakedImage);
          migratedObject = bakedImage;
        }
        util.addTransformToObject(migratedObject, [scaleX, 0, 0, scaleY, 0, 0]);
        migratedObject.setCoords();
      });
    } finally {
      activeCanvas.renderOnAddRemove = renderOnAddRemove;
    }
    return true;
  }
  return false;
}
