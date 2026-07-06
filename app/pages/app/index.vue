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
  // Sem persona nenhuma ativada ainda (conta antiga pré-B1) — default hunter.
  return navigateTo('/app/hunter')
})
</script>

<template>
  <div class="skeleton" style="height: 240px;" />
</template>
