var lr = require('tiny-lr'),
    gulp = require('gulp'),
    livereload = require('gulp-livereload'),
    coffee = require('gulp-coffee'),
    sass = require('gulp-sass'),
    slim = require('gulp-slim'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    connect = require('connect'),
    refresh = require('connect-livereload'),
    serveStatic = require('serve-static'),
    gutil = require('gulp-util'),
    server = lr();

gulp.task('js', function() {
  gulp.src(['./assets/js/**/*.js', '!./assets/js/vendor/**/*.js'])
    .pipe(gulp.dest('./public/'))
    .pipe(livereload(server));

  gulp.src('./assets/js/vendor/**/*.js')
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('./public/'))
    .pipe(livereload(server));
});

gulp.task('images', function() {
  gulp.src('./assets/img/**/*')
    .pipe(gulp.dest('./public/'))
});

gulp.task('coffee', function() {
  gulp.src('./assets/js/**/*.coffee')
    .pipe(coffee({bare: true}).on('error', gutil.log))
    .pipe(concat('application.js'))
    .pipe(gulp.dest('./public/'))
});

gulp.task('sass', function () {
  gulp.src('./assets/stylesheets/**/*.scss')
    .pipe(sass().on('error', gutil.log))
    .pipe(gulp.dest('./public/'));
});

gulp.task('slim', function(){
  gulp.src("./assets/templates/**/*.slim")
    .pipe(slim({ pretty: true, chdir: true, bundler: true }))
    .pipe(gulp.dest("./public/"));
});

gulp.task('http-server', function() {
  connect()
    .use(refresh())
    .use(serveStatic('./public'))
    .listen('9000');

  console.log('Server listening on http://localhost:9000');
});

gulp.task('build', function() {
  gulp.src("./public/**/*")
    .pipe(gulp.dest("./production/public/"))
});

gulp.task('watch', function() {
  gulp.run('images');
  gulp.run('js');
  gulp.run('coffee');
  gulp.run('sass');
  gulp.run('slim');

  server.listen(35729, function(err) {
    if (err) return console.log(err);

    gulp.watch('./assets/img/**/*', function() {
      gulp.run('images');
    });
    gulp.watch('./assets/js/**/*.js', function() {
      gulp.run('js');
    });
    gulp.watch('./assets/js/**/*.coffee', function() {
      gulp.run('coffee');
    });
    gulp.watch('./assets/stylesheets/**/*', function() {
      gulp.run('sass');
    });
    gulp.watch('./assets/templates/**/*', function() {
      gulp.run('slim');
    });
  });
  gulp.run('http-server');
});