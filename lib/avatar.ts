// Elegir una imagen y subirla al bucket 'avatars' de Supabase Storage.
// Guarda la URL pública en profiles.avatar_url. Web y native.
import * as ImagePicker from 'expo-image-picker';
import naclUtil from 'tweetnacl-util';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('Necesito permiso para acceder a tus fotos.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  let bytes: Uint8Array;
  if (asset.base64) {
    bytes = naclUtil.decodeBase64(asset.base64);
  } else {
    const blob = await (await fetch(asset.uri)).blob();
    bytes = new Uint8Array(await blob.arrayBuffer());
  }

  const path = `${userId}/avatar_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: upErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (upErr) throw new Error(upErr.message);

  return url;
}
