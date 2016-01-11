# imagemarker

This is an demo of online image marker. 

This tool is quite convenient for UI designer/developers who need to know the pixel distance precisely, and mark the value/note on the draft image quickly.

Its function includes: 

1. measure the pixel distance between two points in an image, and mark the distance with segment.
2. measure the position of a point in an image, and mark the (x, y) coordinate in the image.
3. add text memos on the images

(With imagemagick, this marker support almost all image formats, even psd. )

run the application by executing:

```javascript
forever start upload.js
node app.js
```


