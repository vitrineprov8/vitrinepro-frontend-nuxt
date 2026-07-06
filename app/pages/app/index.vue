<script setup lang="ts">
// Roteador de workspace: decide para onde mandar o usuário logado
// (T-C00 escolher-perfil quando novo; senão último workspace)
definePageMeta({ layout: 'app', middleware: 'auth' })

const auth = useAuthStore()

onMounted(async () => {
  if (!auth.user) await auth.fetchMe()
  const u = auth.user
  if (!u) return navigateTo('/login')
  // Heurística de roteamento por persona (F2 — antes mandava candidato/empresa
  // para rotas inexistentes; agora usa personas + fallback seguro).
  if (u.isCompany) return navigateTo('/app/empresa')
  const last = safeInternalPath(localStorage.getItem('vp_last_workspace'), '')
  if (last) return navigateTo(last)
  if (u.personas?.includes('HUNTER')) return navigateTo('/app/hunter')
  if (u.personas?.includes('CANDIDATO')) return navigateTo('/app/candidato')
  // F3 — sem persona nenhuma ativada ainda (conta nova ou antiga pré-B1):
  // antes caía direto no workspace hunter sem perguntar nada. Agora manda
  // para a tela de escolha (T-C00).
  return navigateTo('/app/escolher-perfil')
})
</script>

<template>
  <div class="skeleton" style="height: 240px;" />
</template>
