import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Journal API',
    description: 'Auto-generated interactive API documentation for the Journal App backend.',
    version: '1.0.0'
  },
  host: 'localhost:3000',
  schemes: ['http'],
  securityDefinitions: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'jwt'
    },
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Enter your Bearer token in the format: Bearer <token>'
    }
  }
};

// Output path is relative to THIS file's location (swagger/)
const outputFile = './swagger.json';

// Entry point is relative to THIS file — go up one level to reach app.js
const endpointsFiles = ['../app.js'];

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger documentation generated successfully at swagger/swagger.json');
});
