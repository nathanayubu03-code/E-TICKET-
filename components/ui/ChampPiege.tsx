/** Champ invisible contre les robots : un humain ne le voit pas et ne le remplit pas. */
export function ChampPiege() {
  return (
    <div className="piege" aria-hidden="true">
      <label>Site web<input type="text" name="site_web" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
    </div>
  );
}
