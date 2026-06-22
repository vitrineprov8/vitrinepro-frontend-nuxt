<script setup lang="ts">
// Roteador de workspace: decide para onde mandar o usuário logado
// (T-C00 escolher-perfil quando novo; senão último workspace)
definePageMeta({ layout: 'app', middleware: 'auth' })

const auth = useAuthStore()

onMounted(async () => {
  if (!auth.user) await auth.fetchMe()
  const u = auth.user
  if (!u) return navigateTo('/login')
  // Heurística inicial — evolui com o campo de persona (ver PLANO, backend gap B1)
  if (u.isCompany) return navigateTo('/app/empresa')
  const last = localStorage.getItem('vp_last_workspace')
  if (last) return navigateTo(last)
  // TODO(B1): sem persona no backend, default para o workspace hunter.
  return navigateTo('/app/hunter')
})
</script>

<template>
  <div class="skeleton" style="height: 240px;" />
</template>
