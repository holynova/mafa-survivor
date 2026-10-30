import unittest
from monster_audio import monster_mapping

class MonsterAudioTests(unittest.TestCase):
    def test_raw_look_id_and_native_event_offsets(self):
        files = {'02000162.WAV', '02000164.WAV', '02000165.WAV'}
        mapping, aliases, missing = monster_mapping({'orc': 22}, files)
        self.assertEqual(mapping, {'monster:orc:attack': '02000162.WAV',
                                  'monster:orc:hurt': '02000164.WAV',
                                  'monster:orc:death': '02000165.WAV'})
        self.assertEqual(aliases, {})
        self.assertEqual(missing, [])

    def test_missing_variant_is_explicitly_documented_and_never_generated(self):
        mapping, aliases, missing = monster_mapping({'evilSnake': 80, 'scorpionSnake': 79}, {'020004F5.WAV'})
        self.assertEqual(mapping['monster:evilSnake:death'], '020004F5.WAV')
        self.assertEqual(aliases['monster:evilSnake:death']['requested'], '02000505.WAV')
        self.assertIn('monster:evilSnake:attack', missing)
        self.assertNotIn('monster:evilSnake:attack', mapping)

    def test_own_source_wins_over_alias_and_pet_models_are_not_enemy_voices(self):
        mapping, aliases, _ = monster_mapping({'evilSnake': 80, 'scorpionSnake': 79, 'beast': 90, 'summonedSkeleton': 56}, {'02000505.WAV', '020004F5.WAV', '020005A5.WAV'})
        self.assertEqual(mapping['monster:evilSnake:death'], '02000505.WAV')
        self.assertNotIn('monster:evilSnake:death', aliases)
        self.assertFalse(any(':beast:' in k or ':summonedSkeleton:' in k for k in mapping))
