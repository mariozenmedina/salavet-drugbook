export interface UiText {
  appName: string
  welcome: {
    title: string
    subtitle: string
  }
  search: {
    placeholder: string
    empty: string
  }
  prescription: {
    title: string
    clear: string
    print: string
  }
  placeholders: {
    letter: string
    drug: string
  }
}

export async function loadUiText(locale: string): Promise<UiText> {
  const response = await fetch(`/data/${locale}/ui.json`)

  if (!response.ok) {
    throw new Error(`Unable to load UI text for locale: ${locale}`)
  }

  return response.json() as Promise<UiText>
}
