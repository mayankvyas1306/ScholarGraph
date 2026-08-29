import { useState } from 'react'

function QueryForm({ onSubmit, disabled = false }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery || disabled) {
      return
    }

    onSubmit(trimmedQuery)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="research-query">Research question</label>

      <div>
        <input
          id="research-query"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter your research question..."
          disabled={disabled}
        />

        <button type="submit" disabled={disabled || !query.trim()}>
          Search
        </button>
      </div>
    </form>
  )
}

export default QueryForm
