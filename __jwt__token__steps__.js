// 1.after successful login: generate JWT token
// 2.npm i jsonwebtoken cookie-parser
// 3.jwt.sign(payload,secret,{expiresIn: '1d'})
// 4.send token (generated in the server side) to the client side
// i.localStorage --> eaiser
// ii.httpOnly cookies --> better
// 5.For sensitive,secure or private or protected API's : send token to the server side

// Server Side:
// app.use(cors({
    // origin: 'http://localhost:5173', // Where your React app is running
    // credentials: true               // Allow cookies to be shared
// }));

//Client Side:
// axios.post('http://localhost:3000/jwt',userEmail,{withCredentials:true})




// 6.Validate the token in the server side:
// i.if valid : login data
// ii.if invalid : logout

// 7.Check right user accessing his/her own data on permission