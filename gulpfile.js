var gulp = require('gulp'),
      rename = require('gulp-rename'),
      connect = require('gulp-connect'),
      prefix = require('gulp-autoprefixer');


try{
	var sass = require('gulp-sass');
}catch(e){
	console.log("Warning!! Sass is not supported!!");
}

gulp.task('sass',function(){
	gulp.src(['sass/pagination.scss'])
		.pipe(sass())
		.pipe(prefix("last 1 version","> 1%"))
		.pipe(rename("pagination.css"))
		.pipe(gulp.dest('css'))
		.pipe(connect.reload());
})
