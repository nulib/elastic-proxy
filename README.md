# elastic-proxy
This node express application acts as an OpenAM authenticating proxy server between the [NextGen Front End React application](https://github.com/nulib/next-gen-front-end-react) and the Elasticsearch index.

## Setup

### Installing

```bash
$ git clone git@github.com:nulib/elastic-proxy.git
$ cd elastic-proxy
$ yarn install
```

### Running in Development Mode

Create a file called `.env` in the project root directory in the following format:
```
UPSTREAM=http://localhost:9201/
API_TOKEN_SECRET=[SOME_LONG_SUPER_SECRET_TOKEN]
```
(There are other settings but you will probably never need to use anything but their defaults.)

Then run
```bash
$ yarn start
```

### Checking the Server

1. In a browser, go to https://devbox.library.northwestern.edu:3334/auth/login
2. Log into WebSSO (if necessary)
3. You should be redirected to a page with a JSON hash containing your auth token.
4. Open a shell and:

    ```bash
    $ curl -H "X-API-Token: YOUR_AUTH_TOKEN" https://devbox.library.northwestern.edu:3334/auth/whoami
    # or
    $ curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" https://devbox.library.northwestern.edu:3334/auth/whoami
    ```
5. The server should respond with your user details.

### Running the test suite

1. Make sure the Elasticsearch test server is running:

    ```bash
    $ devstack -t up -d elasticsearch
    ```
2. Add the test fixtures to the Elasticsearch test server:

    ```bash
    $ curl --data-binary @"test/fixtures/docs.njson" \
        -H "Content-Type: application/x-ndjson" \
        http://localhost:9202/_bulk
    ```
3. Make sure you have an `AWS_PROFILE` environment variable set to a real profile name
   configured in `~/.aws/credentials` (e.g., `staging`)
4. Start the elastic-proxy server pointing to the test data:

    ```bash
    $ UPSTREAM=http://localhost:9202/ SSL_CERT= SSL_KEY= API_TOKEN_SECRET=TEST_TOKEN yarn start
    ```
5. In another window or tab, run the test suite:

    ```bash
    $ API_TOKEN_SECRET=TEST_TOKEN yarn test
    ```

### Use

Set your client application's Elasticsearch endpoint to `https://devbox.library.northwestern.edu:3334/search/`

## Note

WebSSO tokens only work within the `northwestern.edu` domain. The React frontend and this middleware proxy have to be running and addressable using addresses ending in `northwestern.edu` (though they can be running on different ports).
