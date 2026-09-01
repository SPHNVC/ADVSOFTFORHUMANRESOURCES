import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { ApolloLink } from '@apollo/client/link'
import { SetContextLink } from '@apollo/client/link/context'
import { ErrorLink } from '@apollo/client/link/error'
import { CombinedGraphQLErrors } from '@apollo/client/errors'

const httpLink = new HttpLink({ uri: 'http://localhost:8080/graphql' })

const authLink = new SetContextLink((prevContext) => {
  const token = localStorage.getItem('authToken')
  return {
    headers: {
      ...prevContext.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Defense in depth: if a token expires mid-session, any request that hits an
// @auth-gated field comes back UNAUTHENTICATED — clear the stale session and
// send the user back to the login screen rather than showing a broken page.
const errorLink = new ErrorLink(({ error }) => {
  if (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(e => e.extensions?.code === 'UNAUTHENTICATED')
  ) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.location.assign('/login')
  }
})

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
})

export default client
