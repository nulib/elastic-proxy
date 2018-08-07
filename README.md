# elastic-proxy
This node express application acts as an OpenAM authenticating proxy server between the [NextGen Front End React application](https://github.com/nulib/next-gen-front-end-react) and the Elasticsearch index.

## Setup
NOTE: These instructions depend on the [NUL Developer devbox configuration hack](https://github.com/nulib/donut/wiki/Authentication-setup-for-dev-environment).

### Installing

```bash
$ git clone git@github.com:nulib/elastic-proxy.git
$ cd elastic-proxy
$ yarn install
```

Create a file called `.env` in the project root directory in the following format:
```
UPSTREAM=http://elasticsearch-server.example.edu:9200/
API_TOKEN_SECRET=[SOME_LONG_SUPER_SECRET_TOKEN]
```
(There are other settings but you will probably never need to use anything but their defaults.)

Then run
```bash
$ yarn start
```

### Testing

1. In a browser, go to http://devbox.library.northwestern.edu:3334/auth/login
2. Log into WebSSO (if necessary)
3. You should be redirected to a page with a JSON hash containing your auth token.
4. Open a shell and:

    ```bash
    $ curl -H "X-API-Token: YOUR_AUTH_TOKEN" http://devbox.library.northwestern.edu:3334/auth/whoami
    ```
5. The server should respond with your user details.

### Use

Set your client application's Elasticsearch endpoint to `http://devbox.library.northwestern.edu:3334/search/`

## Note

WebSSO tokens only work within the `northwestern.edu` domain. The React frontend and this middleware proxy have to be running and addressable using addresses ending in `northwestern.edu` (though they can be running on different ports).
