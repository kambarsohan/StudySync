// @ts-nocheck — this function is compiled by the Supabase Deno runtime, not the Vite browser project.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok',{headers:cors})
  if (request.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{...cors,'Content-Type':'application/json'}})
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i,'')
    if (!token) return new Response(JSON.stringify({error:'Sign in again before deleting your account.'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const verifier = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const { data: verified, error: verifyError } = await verifier.auth.getUser(token)
    if (verifyError || !verified.user?.email) return new Response(JSON.stringify({error:'Your session could not be verified. Sign in again.'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const body = await request.json().catch(() => ({})) as {password?:string}
    if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 128) {
      return new Response(JSON.stringify({error:'Enter your current password to confirm account deletion.'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})
    }
    const reauth = await verifier.auth.signInWithPassword({email:verified.user.email,password:body.password})
    if (reauth.error || reauth.data.user?.id !== verified.user.id) {
      return new Response(JSON.stringify({error:'The password could not be verified. Your account has not been deleted.'}),{status:403,headers:{...cors,'Content-Type':'application/json'}})
    }
    const admin = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    for (;;) {
      const { data: objects, error: listError } = await admin.storage.from('avatars').list(verified.user.id,{limit:100,offset:0,sortBy:{column:'name',order:'asc'}})
      if (listError) throw listError
      if (!objects?.length) break
      const paths = objects.filter((object) => object.id && object.name).map((object) => `${verified.user.id}/${object.name}`)
      if (!paths.length) break
      if (paths.length) {
        const { error: removeError } = await admin.storage.from('avatars').remove(paths)
        if (removeError) throw removeError
      }
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(verified.user.id)
    if (deleteError) throw deleteError
    return new Response(JSON.stringify({deleted:true}),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
  } catch (error) {
    console.error('delete-account failed',error)
    return new Response(JSON.stringify({error:'Account deletion could not be completed. Please try again or contact support.'}),{status:500,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
  }
})
