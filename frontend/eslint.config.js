import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'src/api/schema.d.ts', 'src/components/ui/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use api + unwrap from @/api/client.' },
            { name: 'lucide-vue-next', message: 'Use @lucide/vue.' },
            { name: 'lucide-react', message: 'React package. Use @lucide/vue.' },
            { name: 'react', message: 'This is a Vue project.' },
            { name: '@tabler/icons-vue', message: 'Use @lucide/vue.' },
          ],
          patterns: [
            { group: ['@radix-ui/*'], message: 'React/Radix. Use reka-ui via shadcn-vue components.' },
          ],
        },
      ],
    },
  },
)
