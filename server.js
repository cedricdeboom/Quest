var connect = require('connect')
var serveStatic = require('serve-static');
var bodyParser = require('body-parser')
var fs = require('fs');
var ejs = require('ejs');

var app = connect()
var http_server = require('http').createServer(app)
var io = require('socket.io')(http_server)

app.use(serveStatic('public'))
	.use(bodyParser.urlencoded({extended:true}))
	.use(route);

http_server.listen(3000);


//MODEL DATA
rooms = []
sockets = []
id_2_room = []

//CONTROLLER FUNCTIONS
function route(req, res, next) {
	switch(req.url){
		case '/':
			landing(req, res, next);
			break;
		case '/teacher':
			teacher_landing(req, res, next);
			break;
		case '/student':
			student_landing(req, res, next);
			break;
		case '/teacher_room':
			teacher_room(req, res, next);
			break;
		case '/student_room':
			student_room(req, res, next);
			break;
		case '/submit_code':
			submit_code(req, res, next);
			break;
		default:
			res.end('Bad request')
	}
}

function landing(req, res, next) {
	serve_html('./html/landing.html', {}, req, res, next);
}

function teacher_landing(req, res, next) {
	serve_html('./html/teacher_landing.html', {message : ''}, req, res, next);
}

function student_landing(req, res, next) {
	serve_html('./html/student_landing.html', {message : ''}, req, res, next);
}

function teacher_room(req, res, next) {
	if(req.body.password && req.body.room_name) {
		passwd = req.body.password;
		room_n = req.body.room_name;

		if(rooms[room_n]) {
			//room already exists
			serve_html('./html/teacher_landing.html', {message : 'Room name already exists.'}, req, res, next);
		}
		else {
			//adjust model data
			rooms[room_n] = passwd

			//serve html
			serve_html('./html/teacher_room.html', {room_name : room_n}, req, res, next);

			//here client makes connection with io socket (see socket.io listeners)
		}
	} else {
		//Not all fields filled in
		serve_html('./html/teacher_landing.html', {message : 'Please fill in all fields.'}, req, res, next);
	}
}

function student_room(req, res, next) {
	if(req.body.room_name) {
		room_n = req.body.room_name;

		if(rooms[room_n]) {
			//room exists
			serve_html('./html/student_room.html', {room_name : room_n, message : ''}, req, res, next);
		}
		else {
			//room does not exist
			serve_html('./html/student_landing.html', {message : 'Room does not exist (yet). Please wait or try again.'}, req, res, next);
		}
	} else {
		//Not all fields filled in
		serve_html('./html/student_landing.html', {message : 'Please fill in all fields.'}, req, res, next);
	}
}

function submit_code(req, res, next) {
	if(req.body.password && req.body.code_example) {
		room_n = req.body.room_name;
		passwd = req.body.password;
		code = req.body.code_example;

		if(rooms[room_n]) {
			//room exists

			//check password
			if(passwd != rooms[room_n]){
				serve_html('./html/student_room.html', {room_name : room_n, message : 'Wrong password.'}, req, res, next);
			} else {
				if(req.body.to_project){
					//emit code project event
					console.log('Project code to ' + room_n)
					io.in(room_n).emit('project', {
						example: code,
						room: room_n,
						created: Date.now()
					});
				} else {
					//log -> TODO
				}

				//serve html
				serve_html('./html/student_room.html', {room_name : room_n, message: ''}, req, res, next);
			}
		} else {
			//room does not exist
			serve_html('./html/student_landing.html', {message : 'Room does not exist (yet). Please wait or try again.'}, req, res, next);
		}
	} else if(req.body.room_name){
		//Not all fields filled in
		serve_html('./html/student_room.html', {room_name : room_n, message : 'Please fill in all fields.'}, req, res, next);
	} else {
		//Bad request
		serve_html('./html/student_landing.html', {message : ''}, req, res, next);
	}
}

//VIEW FUNCTIONS
function serve_html(file, params, req, res, next) {
	fs.readFile(file, {encoding:'utf-8'}, function(error, content) {
		if (error) {
			res.writeHead(500);
			res.end();
		}
		else {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			var rendered_html = ejs.render(content, params);
			res.end(rendered_html, 'utf-8');
		}
	});
}

//SOCKET.IO LISTENERS
io.sockets.on('connection', function(socket){
	socket.on('set_room', function(data){
		room_n = data.room_name;
		//register socket and join room
		sockets[room_n] = socket;
		id_2_room[socket.id] = room_n;
		socket.join(room_n);
		console.log('Connection to ' + room_n);
	});

	socket.on('disconnect', function(){
		room_n = id_2_room[socket.id]
		delete rooms[room_n];
		delete sockets[room_n];
		delete id_2_room[socket.id]
		console.log('Disconnect from ' + room_n)
	});
});