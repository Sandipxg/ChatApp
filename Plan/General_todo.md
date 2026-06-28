# Node.js Backend Todo

Use this file to track progress topic by topic.

## 1. Express Basics

- [x] Understand route params clearly
- [x] Understand query params clearly
- [x] Understand request body clearly
- [x] Practice response status codes
- [x] Understand middleware basics
- [x] Add global error handler
- [x] Add 404 route not found handler

## 2. Route, Controller, Service Architecture

- [x] Understand route, controller, and service
- [x] Move route logic into controller files
- [x] Keep routes focused only on URL mapping
- [x] Keep controllers focused on request/response
- [x] Keep services focused on business logic
- [x] Understand model concept

## 3. Project Structure

- [x] Create `controllers` folder
- [x] Create `middleware` folder
- [x] Create `utils` folder
- [x] Create `config` folder
- [x] Create `models` folder
- [x] Split `server.js` and `app.js`

## 4. Node.js Module System

- [x] Understand `require(...)`
- [x] Understand `module.exports`
- [x] Understand `./` relative path
- [x] Understand `../` relative path
- [x] Understand `__dirname`
- [x] Understand `path.join(...)`
- [x] Understand CommonJS vs ES Modules basics

## 5. Async/Await

- [x] Learn callbacks
- [x] Learn promises
- [x] Learn async/await
- [x] Learn `fs.promises.readFile`
- [x] Learn `fs.promises.writeFile`
- [x] Convert `authService.js` to async/await
- [x] Convert `journalService.js` to async/await
- [x] Update controllers/routes to handle async service functions


## 7. Environment Variables

- [x] Create `.env`
- [x] Use `dotenv`
- [x] Move `PORT` to `.env`
- [ ] Add `JWT_SECRET` later
- [x] Add database URL later

## 8. MongoDB + Mongoose

- [x] Learn why JSON files are not enough for real apps
- [x] Learn MongoDB basics
- [x] Learn Mongoose basics
- [x] Create `User` model
- [x] Create `Journal` model
- [x] Replace `users.json`
- [x] Replace `data.json`
- [x] Connect database using `.env`

## 9. Database Design Basics

- [x] Understand one-to-many relationships
- [x] Understand User -> Journals relationship
- [x] Understand referencing IDs
- [x] Understand when to embed vs reference

## 10. Cookies vs JWT

- [x] Understand cookie/session auth
- [x] Understand token-based auth
- [x] Understand where JWT can be stored
- [x] Understand basic pros and cons

## 11. Authentication

- [x] Learn password hashing
- [x] Install and use `bcrypt`
- [x] Hash password during signup
- [x] Compare hashed password during login
- [x] Learn JWT basics
- [x] Return JWT after login
- [x] Create auth middleware
- [x] Protect journal routes
- [x] Stop trusting `userId` from frontend

## 12. Social Authentication (OAuth 2.0)

Learn:
- [x] Learn OAuth 2.0 and OpenID Connect (OIDC) protocols
- [x] Understand Authorization Code flow (interaction between browser, backend, and OAuth provider)

Practice:
- [x] Create developer credentials on Google / GitHub Developer Console
- [x] Implement "Sign in with Google" redirect and callback endpoint using Passport.js or native OAuth SDK
- [x] Issue JWT for successfully authenticated social login users

## 13. Validation

- [x] Learn schema validation
- [x] Choose validation library
- [x] Validate signup input
- [x] Validate login input
- [x] Validate journal input
- [x] Return clean validation errors

## 14. API Documentation

- [x] Create simple API docs markdown file
- [x] Document auth endpoints
- [x] Document journal endpoints
- [x] Add request body examples
- [x] Add response examples
- [x] Add status codes

## 15. Security Basics

- [x] Never store plain passwords
- [x] Validate all input
- [x] Learn CORS basics
- [x] Learn rate limiting
- [x] Learn `helmet`
- [x] Avoid leaking internal errors

## 16. API Testing

- [x] Test APIs with Postman or Thunder Client
- [x] Test signup
- [x] Test duplicate signup
- [x] Test login
- [x] Test wrong login
- [x] Test create journal
- [x] Test update journal
- [x] Test delete journal


## 17. Logging Basics

- [x] Learn `console.log()`
- [x] Learn `console.error()`
- [x] Understand what to log during development
- [x] Understand what not to expose to users
- [x] Learn Winston or Pino later

## 18. Deployment

- [x] Learn backend deployment basics
- [x] Deploy backend
- [x] Use hosted database
- [x] Set production environment variables
- [x] Connect frontend to deployed backend

## 19. PWA (Progressive Web App)

- [x] Refer to the detailed checklist in [PWA_todo.md](./PWA_todo.md) to implement offline capabilities, background sync, and install experience.


## 20. Better-Auth Library

- [x] Convert Express backend to ES Modules to natively support Better Auth imports
- [x] Configure Better Auth server instance with MongoDB adapter
- [x] Replace manual JWT generation, token verification, and cookie handling with Better Auth automated sessions
- [x] Replace manual bcrypt hashing & verification with Better Auth's built-in secure credentials system
- [x] Remove custom endpoints for login, signup, logout, and raw Google OAuth redirects, routing all through the catch-all router
- [x] Refactor frontend to use standard email-based login, username signup, and Google social login via the client SDK
- [x] Integrate `authClient.useSession()` React hooks to replace custom local storage session caching and polling


## 21. Docker

Learn:
- [x] Learn Docker basics (Images, Containers, Volumes, and Networking)
- [x] Understand the difference between a `Dockerfile` and `docker-compose.yml`

Practice:
- [x] Create a `Dockerfile` for the Node.js backend
- [x] Create a `Dockerfile` for the React frontend
- [x] Write a `docker-compose.yml` to spin up the frontend, backend, and MongoDB database together locally